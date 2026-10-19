"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/ui/card";
import { api } from "@/lib/api-client";

type Stock = { current: number; purchased: number; sold: number };

export default function LiptonStockPage() {
  const [stock, setStock] = useState<Stock | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Stock>("/api/v1/lipton/stock").then(setStock).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stock) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      <PageHeader title="Stock Lipton" subtitle="Stock = achats − ventes" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Stock actuel" value={String(stock.current)} tone="lipton" />
        <StatCard label="Total acheté" value={String(stock.purchased)} tone="lipton" />
        <StatCard label="Total vendu" value={String(stock.sold)} tone="lipton" />
      </div>
    </div>
  );
}
