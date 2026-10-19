"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/money";

type Stock = { purchasedKg: string; consumedKg: string; remainingKg: string; current: number };

export default function CoffeeStockPage() {
  const [stock, setStock] = useState<Stock | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Stock>("/api/v1/cafe/stock").then(setStock).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stock) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      <PageHeader title="Stock café" subtitle="Stock kg = kilos achetés − (tasses vendues ÷ tasses par kg)" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Café acheté" value={`${formatNumber(stock.purchasedKg, 2)} kg`} tone="cafe" />
        <StatCard label="Café consommé" value={`${formatNumber(stock.consumedKg, 2)} kg`} tone="cafe" />
        <StatCard label="Stock restant" value={`${formatNumber(stock.remainingKg, 2)} kg`} tone="success" />
      </div>
    </div>
  );
}
