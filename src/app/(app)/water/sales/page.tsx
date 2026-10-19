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

export default function WaterSalesPage() {
  const [quantity, setQuantity] = useState("10");
  const [preview, setPreview] = useState<{ unitPrice: string; totalAmount: string; stockCurrent: number } | null>(null);
  const [rows, setRows] = useState<Sale[]>([]);
  const [price, setPrice] = useState("");
  const [canEditPrice, setCanEditPrice] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [now] = useState(new Date());

  const load = useCallback(async (params = "") => {
    setRows(await api<Sale[]>(`/api/v1/water/sales${params}`));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    api<{ bidonSalePrice?: string; sachetSalePrice: string }>("/api/v1/water/settings")
      .then((s) => setPrice(String(Number(s.bidonSalePrice || s.sachetSalePrice))))
      .catch(() => undefined);
    api<{ role: string }>("/api/v1/auth/me")
      .then((me) => setCanEditPrice(me.role === "SUPER_ADMIN"))
      .catch(() => setCanEditPrice(false));
  }, [load]);

  useEffect(() => {
    const q = Number(quantity);
    if (!q) return;
    api<{ unitPrice: string; totalAmount: string; stockCurrent: number }>(`/api/v1/water/sales?preview=1&quantity=${q}`)
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [quantity]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const sale = await api<Sale>("/api/v1/water/sales", {
        method: "POST",
        body: JSON.stringify({ quantity: Number(quantity) }),
      });
      setOk(`Vente enregistrée — ${sale.quantity} bidon(s) · ${formatGnf(sale.totalAmount)}`);
      await load();
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
      <PageHeader title="Ventes d'eau" subtitle="Vente au bidon. Le prix est fixé par l'administrateur. L'eau n'est plus liée aux tasses de café." />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-xl">Nouvelle vente</h2>
          <p className="mt-1 text-xs text-slate-500">{formatDate(now)} · {formatTime(now)}</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            {canEditPrice ? (
              <>
                <Field label="Prix d'un bidon (GNF) — admin">
                  <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={async () => {
                    try {
                      await api("/api/v1/water/settings", {
                        method: "PATCH",
                        body: JSON.stringify({ bidonSalePrice: Number(price) }),
                      });
                      setOk("Prix du bidon enregistré");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Erreur");
                    }
                  }}
                >
                  Enregistrer le prix du bidon
                </Button>
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">Prix d&apos;un bidon</span>
                <strong className="ml-2 text-slate-900">{price ? formatGnf(price) : "—"}</strong>
              </div>
            )}
            <Field label="Nombre de bidons vendus">
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            </Field>
            <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span>Prix unitaire</span><strong>{preview ? formatGnf(preview.unitPrice) : "—"}</strong></div>
              <div className="flex justify-between"><span>Total</span><strong>{preview ? formatGnf(preview.totalAmount) : "—"}</strong></div>
              <div className="flex justify-between"><span>Stock restant</span><strong>{preview?.stockCurrent ?? "—"}</strong></div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full" size="lg">Enregistrer</Button>
          </form>
        </Card>
        <DataTable
          rows={rows}
          columns={columns}
          exportModule="water-sales"
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
