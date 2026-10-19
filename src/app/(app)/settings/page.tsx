"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

type Biz = { amortizationPercentPerDelivery: string; nextMotorcycleTarget: string };
type Water = { bidonSalePrice?: string; sachetSalePrice: string };
type Lipton = { pieceSalePrice: string; piecesPerPack?: number | string };

export default function SettingsPage() {
  const [biz, setBiz] = useState<Biz | null>(null);
  const [water, setWater] = useState<Water | null>(null);
  const [lipton, setLipton] = useState<Lipton | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    api<Biz>("/api/v1/settings").then(setBiz).catch((e) => setError(e.message));
    api<Water>("/api/v1/water/settings").then(setWater).catch((e) => setError(e.message));
    api<Lipton>("/api/v1/lipton/settings").then(setLipton).catch((e) => setError(e.message));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!biz || !water || !lipton) return;
    setError("");
    setOk("");
    try {
      await Promise.all([
        api("/api/v1/settings", {
          method: "PATCH",
          body: JSON.stringify({
            amortizationPercentPerDelivery: Number(biz.amortizationPercentPerDelivery),
            nextMotorcycleTarget: Number(biz.nextMotorcycleTarget),
          }),
        }),
        api("/api/v1/water/settings", {
          method: "PATCH",
          body: JSON.stringify({
            bidonSalePrice: Number(water.bidonSalePrice || water.sachetSalePrice),
          }),
        }),
        api("/api/v1/lipton/settings", {
          method: "PATCH",
          body: JSON.stringify({
            pieceSalePrice: Number(lipton.pieceSalePrice),
            piecesPerPack: Number(lipton.piecesPerPack || 100),
          }),
        }),
      ]);
      setOk("Paramètres enregistrés");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (!biz || !water || !lipton) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Amortissement, objectif moto, prix de l'eau et du Lipton." />
      <Card className="max-w-xl p-6">
        <form onSubmit={save} className="space-y-4">
          <Field label="Amortissement par livraison (%)">
            <Input type="number" min={0} max={100} step="0.01" value={biz.amortizationPercentPerDelivery} onChange={(e) => setBiz({ ...biz, amortizationPercentPerDelivery: e.target.value })} />
          </Field>
          <Field label="Objectif prochaine moto (GNF)">
            <Input type="number" min={1} value={biz.nextMotorcycleTarget} onChange={(e) => setBiz({ ...biz, nextMotorcycleTarget: e.target.value })} />
          </Field>
          <Field label="Prix de vente d'un bidon d'eau (GNF)">
            <Input type="number" min={1} value={water.bidonSalePrice || water.sachetSalePrice} onChange={(e) => setWater({ ...water, bidonSalePrice: e.target.value, sachetSalePrice: e.target.value })} />
          </Field>
          <Field label="Prix de vente d'une pièce Lipton (GNF)">
            <Input type="number" min={1} value={lipton.pieceSalePrice} onChange={(e) => setLipton({ ...lipton, pieceSalePrice: e.target.value })} />
          </Field>
          <Field label="Pièces dans chaque paquet Lipton">
            <Input type="number" min={1} value={String(lipton.piecesPerPack ?? 100)} onChange={(e) => setLipton({ ...lipton, piecesPerPack: e.target.value })} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
          <Button type="submit">Enregistrer</Button>
        </form>
      </Card>
    </div>
  );
}
