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
  packCount?: number;
  piecesPerPack?: number;
  quantity: number;
  totalPrice: string;
  avgUnitCost: string;
  supplier?: string;
  occurredAt: string;
  employee: { id: string; fullName: string };
};

export default function LiptonPurchasesPage() {
  const [packCount, setPackCount] = useState("1");
  const [piecesPerPack, setPiecesPerPack] = useState("100");
  const [totalPrice, setTotalPrice] = useState("200000");
  const [supplier, setSupplier] = useState("");
  const [rows, setRows] = useState<Purchase[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async (params = "") => {
    setRows(await api<Purchase[]>(`/api/v1/lipton/purchases${params}`));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    api<{ piecesPerPack?: number }>("/api/v1/lipton/settings")
      .then((s) => {
        if (s.piecesPerPack) setPiecesPerPack(String(s.piecesPerPack));
      })
      .catch(() => undefined);
  }, [load]);

  const packs = Number(packCount);
  const perPack = Number(piecesPerPack);
  const pieces = packs > 0 && perPack > 0 ? packs * perPack : 0;
  const avg = pieces > 0 ? Number(totalPrice) / pieces : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api("/api/v1/lipton/purchases", {
        method: "POST",
        body: JSON.stringify({
          packCount: Number(packCount),
          piecesPerPack: Number(piecesPerPack),
          totalPrice: Number(totalPrice),
          supplier,
        }),
      });
      setOk(`Achat enregistré — ${pieces} pièces (${packCount} paquets × ${piecesPerPack})`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<Purchase>[] = [
    { key: "date", header: "Date", render: (r) => `${formatDate(r.occurredAt)} ${formatTime(r.occurredAt)}` },
    { key: "packs", header: "Paquets", render: (r) => r.packCount ?? "—" },
    { key: "per", header: "Pièces / paquet", render: (r) => r.piecesPerPack ?? "—" },
    { key: "qty", header: "Total pièces", render: (r) => r.quantity },
    { key: "total", header: "Prix total", render: (r) => formatGnf(r.totalPrice) },
    { key: "avg", header: "Prix / pièce", render: (r) => formatGnf(r.avgUnitCost) },
    { key: "sup", header: "Fournisseur", render: (r) => r.supplier || "—" },
    { key: "user", header: "Employé", render: (r) => r.employee.fullName },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Achats Lipton"
        subtitle="Indiquez le nombre de paquets et combien de pièces il y a dans chaque paquet (souvent 100)."
      />
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nombre de paquets">
              <Input type="number" min={1} step={1} value={packCount} onChange={(e) => setPackCount(e.target.value)} required />
            </Field>
            <Field label="Pièces dans chaque paquet">
              <Input type="number" min={1} step={1} value={piecesPerPack} onChange={(e) => setPiecesPerPack(e.target.value)} required />
            </Field>
            <Field label="Prix total (GNF)">
              <Input type="number" min={1} value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} required />
            </Field>
            <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span>Total pièces</span>
                <strong>{pieces} pièces</strong>
              </div>
              <p className="text-xs text-slate-500">
                {packCount || 0} paquets × {piecesPerPack || 0} pièces
              </p>
              <div className="flex justify-between pt-2">
                <span>Prix moyen / pièce</span>
                <strong>{formatGnf(avg || 0)}</strong>
              </div>
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
          exportModule="lipton-purchases"
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
