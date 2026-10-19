"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { formatGnf } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/timezone";

type Purchase = {
  id: string;
  kind: "CUP" | "SPOON";
  quantity: number;
  totalPrice: string;
  supplier?: string;
  occurredAt: string;
  employee: { fullName: string };
};

type Stock = { cups: { current: number; purchased: number; consumed: number }; spoons: { current: number; purchased: number; consumed: number } };

export default function SuppliesPage() {
  const [kind, setKind] = useState<"CUP" | "SPOON">("CUP");
  const [quantity, setQuantity] = useState("100");
  const [totalPrice, setTotalPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [stock, setStock] = useState<Stock | null>(null);
  const [rows, setRows] = useState<Purchase[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    const [purchases, s] = await Promise.all([
      api<Purchase[]>("/api/v1/supplies"),
      api<Stock>("/api/v1/supplies?stock=1"),
    ]);
    setRows(purchases);
    setStock(s);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api("/api/v1/supplies", {
        method: "POST",
        body: JSON.stringify({ kind, quantity: Number(quantity), totalPrice: Number(totalPrice), supplier }),
      });
      setOk("Achat enregistré");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<Purchase>[] = [
    { key: "date", header: "Date", render: (r) => `${formatDate(r.occurredAt)} ${formatTime(r.occurredAt)}` },
    { key: "kind", header: "Article", render: (r) => (r.kind === "CUP" ? "Tasses" : "Cuillères") },
    { key: "qty", header: "Qté", render: (r) => r.quantity },
    { key: "total", header: "Prix", render: (r) => formatGnf(r.totalPrice) },
    { key: "user", header: "Employé", render: (r) => r.employee.fullName },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Tasses et cuillères" subtitle="Chaque tasse de café vendue consomme 1 tasse et 1 cuillère si le stock est disponible." />
      {stock ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Tasses en stock" value={String(stock.cups.current)} tone="cafe" />
          <StatCard label="Tasses utilisées" value={String(stock.cups.consumed)} />
          <StatCard label="Cuillères en stock" value={String(stock.spoons.current)} tone="cafe" />
          <StatCard label="Cuillères utilisées" value={String(stock.spoons.consumed)} />
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Article">
              <Select value={kind} onChange={(e) => setKind(e.target.value as "CUP" | "SPOON")}>
                <option value="CUP">Tasses</option>
                <option value="SPOON">Cuillères</option>
              </Select>
            </Field>
            <Field label="Quantité achetée">
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </Field>
            <Field label="Prix total (GNF)">
              <Input type="number" min={1} value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} required />
            </Field>
            <Field label="Fournisseur (facultatif)">
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full">Enregistrer l&apos;achat</Button>
          </form>
        </Card>
        <DataTable rows={rows} columns={columns} searchKeys={[(r) => r.employee.fullName]} />
      </div>
    </div>
  );
}
