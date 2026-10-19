"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/ui/card";
import { api } from "@/lib/api-client";

type Stock = { current: number; purchased: number; offered: number; sold: number };

export default function WaterStockPage() {
  const [stock, setStock] = useState<Stock | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Stock>("/api/v1/water/stock").then(setStock).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stock) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      <PageHeader title="Stock eau" subtitle="Stock = bidons achetés − bidons vendus (l'eau n'est plus offerte avec le café)" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Bidons en stock" value={String(stock.current)} tone="eau" />
        <StatCard label="Bidons achetés" value={String(stock.purchased)} tone="eau" />
        <StatCard label="Bidons vendus" value={String(stock.sold)} tone="eau" />
      </div>
    </div>
  );
}
