"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard } from "@/components/ui/card";
import { formatGnf, formatNumber } from "@/lib/money";
import { api } from "@/lib/api-client";

type Summary = {
  motorcycleCount: number;
  progress: { fund: string; target: string; remaining: string; percent: string };
  settings: { amortizationPercentPerDelivery: string; nextMotorcycleTarget: string };
};

export default function AmortizationPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Summary>("/api/v1/transport/amortization").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Amortissement" subtitle={`Chaque livraison alimente le fonds à ${formatNumber(data.settings.amortizationPercentPerDelivery, 2)} %.`} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Fonds" value={formatGnf(data.progress.fund)} tone="transport" />
        <StatCard label="Objectif prochaine moto" value={formatGnf(data.progress.target)} tone="transport" />
        <StatCard label="Reste" value={formatGnf(data.progress.remaining)} tone="transport" />
        <StatCard label="Progression" value={`${formatNumber(data.progress.percent, 2)} %`} tone="success" />
      </div>
      <Card className="p-6">
        <div className="h-4 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-transport" style={{ width: `${Math.min(100, Number(data.progress.percent))}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-500">{data.motorcycleCount} moto(s) en parc.</p>
      </Card>
    </div>
  );
}
