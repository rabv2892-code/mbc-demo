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

type Sale = {
  id: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  occurredAt: string;
  employee: { id: string; fullName: string };
};

type Preview = {
  unitPrice: string;
  totalAmount: string;
  stockCurrent: number;
  sugarEstimated: number;
};

export default function LiptonSalesPage() {
  const [quantity, setQuantity] = useState("1");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<Sale[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [now] = useState(new Date());

  const load = useCallback(async (params = "") => {
    setRows(await api<Sale[]>(`/api/v1/lipton/sales${params}`));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  useEffect(() => {
    const q = Number(quantity);
    if (!q) return;
    api<Preview>(`/api/v1/lipton/sales?preview=1&quantity=${q}`)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [quantity]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const sale = await api<Sale>("/api/v1/lipton/sales", {
        method: "POST",
        body: JSON.stringify({ quantity: Number(quantity) }),
      });
      setOk(`Vente enregistrée — ${sale.quantity} pièce(s) · ${formatGnf(sale.totalAmount)}`);
      await load();
      const q = Number(quantity);
      if (q) {
        setPreview(await api<Preview>(`/api/v1/lipton/sales?preview=1&quantity=${q}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<Sale>[] = [
    { key: "date", header: "Date", sortValue: (r) => r.occurredAt, render: (r) => formatDate(r.occurredAt) },
    { key: "time", header: "Heure", render: (r) => formatTime(r.occurredAt) },
    { key: "qty", header: "Qté", render: (r) => r.quantity },
    { key: "unit", header: "P.U.", render: (r) => formatGnf(r.unitPrice) },
    { key: "total", header: "Total", render: (r) => formatGnf(r.totalAmount) },
    { key: "user", header: "Employé", render: (r) => r.employee.fullName },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ventes Lipton"
        subtitle="Saisissez uniquement la quantité. Prix, date, heure et employé sont calculés par le serveur."
      />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-xl">Nouvelle vente</h2>
          <p className="mt-1 text-xs text-slate-500">{formatDate(now)} · {formatTime(now)}</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Quantité vendue (pièces)">
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            </Field>
            <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span>Prix unitaire</span><strong>{preview ? formatGnf(preview.unitPrice) : "—"}</strong></div>
              <div className="flex justify-between"><span>Total</span><strong>{preview ? formatGnf(preview.totalAmount) : "—"}</strong></div>
              <div className="flex justify-between"><span>Stock restant</span><strong>{preview?.stockCurrent ?? "—"}</strong></div>
              <div className="flex justify-between text-slate-500"><span>Sucre estimé</span><span>{preview ? `${preview.sugarEstimated} morceaux` : "—"}</span></div>
            </div>
            {preview && preview.stockCurrent <= 0 ? (
              <p className="text-sm text-amber-800">
                Aucun stock Lipton. Un Super Admin doit d’abord enregistrer un achat.
              </p>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full" size="lg">Enregistrer</Button>
          </form>
        </Card>
        <DataTable
          rows={rows}
          columns={columns}
          exportModule="lipton-sales"
          searchKeys={[(r) => r.employee.fullName]}
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
