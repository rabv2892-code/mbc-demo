"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { formatGnf } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/timezone";

type Purchase = {
  id: string;
  bidonCount?: number;
  quantity: number;
  totalPrice: string;
  avgUnitCost: string;
  supplier?: string;
  occurredAt: string;
  employee: { id: string; fullName: string };
};

export default function WaterPurchasesPage() {
  const [bidonCount, setBidonCount] = useState("10");
  const [totalPrice, setTotalPrice] = useState("100000");
  const [supplier, setSupplier] = useState("");
  const [rows, setRows] = useState<Purchase[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async (params = "") => {
    setRows(await api<Purchase[]>(`/api/v1/water/purchases${params}`));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const bidons = Number(bidonCount);
  const avg = bidons > 0 ? Number(totalPrice) / bidons : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api("/api/v1/water/purchases", {
        method: "POST",
        body: JSON.stringify({
          bidonCount: Number(bidonCount),
          totalPrice: Number(totalPrice),
          supplier,
        }),
      });
      setOk(`Achat enregistré — ${bidonCount} bidon(s)`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<Purchase>[] = [
    { key: "date", header: "Date", render: (r) => `${formatDate(r.occurredAt)} ${formatTime(r.occurredAt)}` },
    { key: "qty", header: "Bidons", render: (r) => r.bidonCount || r.quantity },
    { key: "total", header: "Prix total", render: (r) => formatGnf(r.totalPrice) },
    { key: "avg", header: "Prix / bidon", render: (r) => formatGnf(r.avgUnitCost) },
    { key: "sup", header: "Fournisseur", render: (r) => r.supplier || "—" },
    { key: "user", header: "Employé", render: (r) => r.employee.fullName },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Achats d'eau" subtitle="Indiquez le nombre de bidons achetés et le prix total payé." />
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nombre de bidons">
              <Input type="number" min={1} step={1} value={bidonCount} onChange={(e) => setBidonCount(e.target.value)} required />
            </Field>
            <Field label="Prix total (GNF)">
              <Input type="number" min={1} value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} required />
            </Field>
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              Prix moyen / bidon : <strong>{formatGnf(avg || 0)}</strong>
            </div>
            <Field label="Fournisseur (facultatif)">
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full">Enregistrer l&apos;achat</Button>
          </form>
        </Card>
        <DataTable
          rows={rows}
          columns={columns}
          exportModule="water-purchases"
          searchKeys={[(r) => r.supplier || "", (r) => r.employee.fullName]}
          onFilterChange={(f) => {
            const qs = new URLSearchParams();
            if (f.q) qs.set("q", f.q);
            if (f.from) qs.set("from", f.from);
            if (f.to) qs.set("to", f.to);
            load(`?${qs}`).catch((e) => setError(e.message));
          }}
        />
      </div>
    </div>
  );
}
