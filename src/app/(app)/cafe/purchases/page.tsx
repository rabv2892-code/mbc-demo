"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { formatGnf, formatNumber } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/timezone";

type Purchase = {
  id: string;
  qtyKg: string;
  totalPrice: string;
  pricePerKg: string;
  reference?: string;
  notes?: string;
  occurredAt: string;
  employee: { id: string; fullName: string };
};

type CafeSettings = {
  cupsPerKg: string;
  purchasePricePerKg: string;
  cupSalePrice: string;
};

function toAmount(value: string): number {
  const n = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function CoffeePurchasesPage() {
  const [qtyKg, setQtyKg] = useState("");
  const [settings, setSettings] = useState<CafeSettings | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Purchase[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async (params = "") => {
    setRows(await api<Purchase[]>(`/api/v1/cafe/purchases${params}`));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    api<Array<{ id: string; fullName: string }>>("/api/v1/users/directory").then(setUsers).catch(() => setUsers([]));
    api<CafeSettings>("/api/v1/cafe/settings")
      .then(setSettings)
      .catch(() => undefined);
  }, [load]);

  const kg = toAmount(qtyKg);
  const pricePerKg = settings ? toAmount(settings.purchasePricePerKg) : 0;
  const cupsPerKg = settings ? toAmount(settings.cupsPerKg) : 0;
  const total = useMemo(() => (kg > 0 && pricePerKg > 0 ? kg * pricePerKg : 0), [kg, pricePerKg]);
  const theoretical = kg > 0 && cupsPerKg > 0 ? kg * cupsPerKg : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (kg <= 0) {
      setError("Indiquez uniquement le nombre de kilos. Le total se calcule tout seul.");
      return;
    }
    if (pricePerKg <= 0) {
      setError("Fixez d'abord le prix du kilo dans Paramètres café.");
      return;
    }
    try {
      await api("/api/v1/cafe/purchases", {
        method: "POST",
        body: JSON.stringify({ qtyKg: kg, reference, notes }),
      });
      setOk(`Achat enregistré — ${formatNumber(kg, 2)} kg × ${formatGnf(pricePerKg)} = ${formatGnf(total)}`);
      setQtyKg("");
      setReference("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<Purchase>[] = [
    { key: "date", header: "Date", sortValue: (r) => r.occurredAt, render: (r) => `${formatDate(r.occurredAt)} ${formatTime(r.occurredAt)}` },
    { key: "qty", header: "Kg", render: (r) => formatNumber(r.qtyKg, 2) },
    { key: "total", header: "Prix total", render: (r) => formatGnf(r.totalPrice) },
    { key: "pkg", header: "Prix/kg", render: (r) => formatGnf(r.pricePerKg) },
    { key: "ref", header: "Réf.", render: (r) => r.reference || "—" },
    { key: "user", header: "Employé", render: (r) => r.employee.fullName },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Achats café"
        subtitle="Saisissez uniquement le nombre de kilos. Le total = kilos × prix du kilo (paramètres)."
      />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-xl">Nouvel achat</h2>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Quantité achetée (kg)">
              <Input
                type="number"
                min={0.01}
                step="0.01"
                inputMode="decimal"
                placeholder="Ex. 20"
                value={qtyKg}
                onChange={(e) => setQtyKg(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Prix du kilo (paramètres)</span>
                <span className="font-medium text-slate-900">{pricePerKg > 0 ? formatGnf(pricePerKg) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total automatique</span>
                <span className="font-semibold text-cafe">{total > 0 ? formatGnf(total) : "Saisissez les kilos"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tasses théoriques</span>
                <span className="font-medium text-slate-900">
                  {theoretical > 0 ? `${formatNumber(theoretical, 0)} (${cupsPerKg} tasses / kg)` : "—"}
                </span>
              </div>
            </div>
            {total > 0 ? (
              <p className="text-xs text-slate-500">
                {formatNumber(kg, 2)} kg × {formatGnf(pricePerKg)} = {formatGnf(total)}
              </p>
            ) : null}
            <p className="text-xs text-slate-500">
              Pour changer le prix du kilo ou le nombre de tasses par kg, allez dans{" "}
              <Link href="/cafe/settings" className="font-medium text-cafe underline">
                Paramètres café
              </Link>
              .
            </p>
            <Field label="Référence">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full">Enregistrer l&apos;achat</Button>
          </form>
        </Card>
        <DataTable
          rows={rows}
          columns={columns}
          exportModule="coffee-purchases"
          users={users}
          searchKeys={[(r) => r.employee.fullName, (r) => r.reference || ""]}
          onFilterChange={(f) => {
            const qs = new URLSearchParams();
            if (f.q) qs.set("q", f.q);
            if (f.from) qs.set("from", f.from);
            if (f.to) qs.set("to", f.to);
            if (f.employeeId) qs.set("employeeId", f.employeeId);
            load(`?${qs}`).catch((e) => setError(e.message));
          }}
        />
      </div>
    </div>
  );
}
