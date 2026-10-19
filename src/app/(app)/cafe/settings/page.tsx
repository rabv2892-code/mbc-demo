"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { formatGnf } from "@/lib/money";

type Settings = {
  cupsPerKg: string;
  purchasePricePerKg: string;
  cupSalePrice: string;
};

export default function CoffeeSettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    api<Settings>("/api/v1/cafe/settings").then(setData).catch((e) => setError(e.message));
    api<{ role: string }>("/api/v1/auth/me").then((u) => setRole(u.role)).catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setError("");
    setOk("");
    try {
      const updated = await api<Settings>("/api/v1/cafe/settings", {
        method: "PATCH",
        body: JSON.stringify({
          cupsPerKg: Number(data.cupsPerKg),
          purchasePricePerKg: Number(data.purchasePricePerKg),
          cupSalePrice: Number(data.cupSalePrice),
        }),
      });
      setData(updated);
      setOk("Paramètres enregistrés — les ventes et achats suivants utilisent ces valeurs.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (!data) return <p className="text-slate-500">Chargement…</p>;
  const canEdit = role === "SUPER_ADMIN";
  const cups = Number(data.cupsPerKg);
  const priceKg = Number(data.purchasePricePerKg);
  const priceCup = Number(data.cupSalePrice);
  const costCup = cups > 0 && priceKg > 0 ? priceKg / cups : 0;
  const margin = priceCup > 0 && costCup > 0 ? priceCup - costCup : 0;

  return (
    <div>
      <PageHeader
        title="Paramètres café"
        subtitle="Fixez le prix d'achat du kilo, le nombre de tasses par kilo et le prix de vente d'une tasse. Modifiables à tout moment."
      />
      <Card className="max-w-xl p-6">
        <form onSubmit={save} className="space-y-4">
          <Field label="Prix d'achat d'un kilo (GNF)">
            <Input
              type="number"
              min={1}
              step="1"
              value={Number(data.purchasePricePerKg) || ""}
              disabled={!canEdit}
              onChange={(e) => setData({ ...data, purchasePricePerKg: e.target.value })}
            />
          </Field>
          <p className="text-sm text-slate-500">
            Utilisé pour les achats : vous saisissez seulement les kilos, le total se calcule tout seul.
            {priceKg > 0 ? ` Actuel : ${formatGnf(priceKg)} / kg.` : ""}
          </p>
          <Field label="Tasses obtenues avec 1 kg">
            <Input
              type="number"
              min={1}
              value={Number(data.cupsPerKg) || ""}
              disabled={!canEdit}
              onChange={(e) => setData({ ...data, cupsPerKg: e.target.value })}
            />
          </Field>
          <Field label="Prix de vente d'une tasse (GNF)">
            <Input
              type="number"
              min={1}
              value={Number(data.cupSalePrice) || ""}
              disabled={!canEdit}
              onChange={(e) => setData({ ...data, cupSalePrice: e.target.value })}
            />
          </Field>
          <p className="text-sm text-slate-500">
            Utilisé pour les ventes : le vendeur saisit seulement le nombre de tasses.
            {priceCup > 0 ? ` Actuel : ${formatGnf(priceCup)} / tasse.` : ""}
          </p>
          {costCup > 0 ? (
            <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Coût théorique / tasse</span>
                <span className="font-medium">{formatGnf(costCup)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Marge théorique / tasse</span>
                <span className="font-medium">{formatGnf(margin)}</span>
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
          {canEdit ? (
            <Button type="submit">Enregistrer</Button>
          ) : (
            <p className="text-sm text-slate-500">Lecture seule.</p>
          )}
        </form>
      </Card>
    </div>
  );
}
