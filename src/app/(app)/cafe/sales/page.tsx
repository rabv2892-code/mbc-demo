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
  costAmount: string;
  profitAmount: string;
  occurredAt: string;
  employee: { id: string; fullName: string };
};

type Preview = {
  unitPrice: string;
  totalAmount: string;
  profitAmount: string;
  waterOffered: number;
  stockCurrent: number;
  coffeeStockKg?: string;
  cupsStock?: number;
  spoonsStock?: number;
  cupsPerKg?: string;
};

export default function CoffeeSalesPage() {
  const [quantity, setQuantity] = useState("20");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<Sale[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now] = useState(new Date());

  const load = useCallback(async (params = "") => {
    const data = await api<Sale[]>(`/api/v1/cafe/sales${params}`);
    setRows(data);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    api<Array<{ id: string; fullName: string }>>("/api/v1/users/directory")
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [load]);

  useEffect(() => {
    const q = Number(quantity);
    if (!q) {
      setPreview(null);
      return;
    }
    api<Preview>(`/api/v1/cafe/sales?preview=1&quantity=${q}`)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [quantity]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const sale = await api<Sale & { waterOffered?: number }>("/api/v1/cafe/sales", {
        method: "POST",
        body: JSON.stringify({ quantity: Number(quantity) }),
      });
      setSuccess(
        `Vente enregistrée — ${sale.quantity} tasses · ${formatGnf(sale.totalAmount)} · ${formatDate(sale.occurredAt)} — ${formatTime(sale.occurredAt)}`,
      );
      setQuantity("20");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Sale>[] = [
    { key: "date", header: "Date", sortValue: (r) => r.occurredAt, render: (r) => formatDate(r.occurredAt) },
    { key: "time", header: "Heure", render: (r) => formatTime(r.occurredAt) },
    { key: "qty", header: "Qté", sortValue: (r) => r.quantity, render: (r) => r.quantity },
    { key: "unit", header: "P.U.", render: (r) => formatGnf(r.unitPrice) },
    { key: "total", header: "Total", render: (r) => formatGnf(r.totalAmount) },
    { key: "cost", header: "Coût", render: (r) => formatGnf(r.costAmount) },
    { key: "profit", header: "Bénéfice", render: (r) => formatGnf(r.profitAmount) },
    { key: "user", header: "Employé", render: (r) => r.employee.fullName },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Ventes café" subtitle="Saisissez uniquement le nombre de tasses. Prix et totaux viennent des paramètres café." />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-xl">Nouvelle vente</h2>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(now)} · {formatTime(now)}
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Quantité vendue (tasses)">
              <Input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            </Field>
            <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              <Row label="Prix unitaire" value={preview ? formatGnf(preview.unitPrice) : "—"} />
              <Row label="Rendement" value={preview?.cupsPerKg ? `1 kg = ${Number(preview.cupsPerKg)} tasses` : "—"} />
              <Row label="Total" value={preview ? formatGnf(preview.totalAmount) : "—"} />
              <Row label="Bénéfice estimé" value={preview ? formatGnf(preview.profitAmount) : "—"} />
              <Row label="Stock café" value={preview?.coffeeStockKg ? `${Number(preview.coffeeStockKg).toFixed(2)} kg` : "—"} />
              <Row label="Tasses restantes" value={preview ? String(preview.cupsStock ?? "—") : "—"} />
              <Row label="Cuillères restantes" value={preview ? String(preview.spoonsStock ?? "—") : "—"} />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
            <Button type="submit" className="w-full" size="lg" disabled={saving}>
              Enregistrer la vente
            </Button>
          </form>
        </Card>
        <div>
          <DataTable
            rows={rows}
            columns={columns}
            exportModule="coffee-sales"
            users={users}
            searchKeys={[(r) => r.employee.fullName, (r) => String(r.quantity)]}
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
