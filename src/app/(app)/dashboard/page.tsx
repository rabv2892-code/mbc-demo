"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/ui/card";
import { formatGnf, formatNumber } from "@/lib/money";
import { api } from "@/lib/api-client";

type Dashboard = {
  role: string;
  cafe?: { todaySales: number; cups: number; revenue: string; profit: string; estimatedKg: string; stockKg?: string };
  water?: { stock: number; purchased: number; offered: number; sold: number; revenue: string };
  lipton?: { stock: number; purchased: number; sold: number; todaySold: number; revenue: string };
  cigarettes?: { todaySold: number; revenue: string };
  juice?: { todaySold: number; revenue: string };
  transport?: {
    todayCount: number;
    revenue: string;
    amortization: string;
    motorcycleCount: number;
    progress: { fund: string; target: string; remaining: string; percent: string };
  };
  global?: { cafe: string; water: string; lipton?: string; cigarettes?: string; juice?: string; transport: string; total: string };
  rider?: { todayCount: number; todayRevenue: string };
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/api/v1/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Chargement…</p>;

  if (data.role === "MOTARD" && data.rider) {
    return (
      <div>
        <PageHeader title="Tableau de bord" subtitle="Vos livraisons du jour" />
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard label="Livraisons aujourd'hui" value={String(data.rider.todayCount)} tone="transport" />
          <StatCard label="Chiffre d'affaires" value={formatGnf(data.rider.todayRevenue)} tone="success" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Tableau de bord" subtitle="Vision du jour — calculs côté serveur" />

      {data.cafe ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cafe">Café</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Ventes du jour" value={String(data.cafe.todaySales)} tone="cafe" />
            <StatCard label="Tasses" value={String(data.cafe.cups)} tone="cafe" />
            <StatCard label="Chiffre d'affaires" value={formatGnf(data.cafe.revenue)} tone="cafe" />
            <StatCard label="Bénéfice" value={formatGnf(data.cafe.profit)} tone="success" />
            <StatCard label="Café estimé" value={`${formatNumber(data.cafe.estimatedKg, 2)} kg`} tone="cafe" />
            {data.cafe.stockKg ? <StatCard label="Stock café" value={`${formatNumber(data.cafe.stockKg, 2)} kg`} tone="cafe" /> : null}
          </div>
        </section>
      ) : null}

      {data.water ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-eau">Eau</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Stock actuel" value={String(data.water.stock)} tone="eau" />
            <StatCard label="Total acheté" value={String(data.water.purchased)} tone="eau" />
            <StatCard label="Offerte" value={String(data.water.offered)} tone="eau" />
            <StatCard label="Vendue" value={String(data.water.sold)} tone="eau" />
            <StatCard label="CA eau" value={formatGnf(data.water.revenue)} tone="eau" />
          </div>
        </section>
      ) : null}

      {data.cigarettes ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Cigarettes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Pièces vendues aujourd'hui" value={String(data.cigarettes.todaySold)} />
            <StatCard label="CA cigarettes" value={formatGnf(data.cigarettes.revenue)} />
          </div>
        </section>
      ) : null}

      {data.juice ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Jus</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Pièces vendues aujourd'hui" value={String(data.juice.todaySold)} />
            <StatCard label="CA jus" value={formatGnf(data.juice.revenue)} />
          </div>
        </section>
      ) : null}

      {data.lipton ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-lipton">Lipton</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Stock actuel" value={String(data.lipton.stock)} tone="lipton" />
            <StatCard label="Total acheté" value={String(data.lipton.purchased)} tone="lipton" />
            <StatCard label="Vendues aujourd'hui" value={String(data.lipton.todaySold)} tone="lipton" />
            <StatCard label="CA Lipton" value={formatGnf(data.lipton.revenue)} tone="lipton" />
          </div>
        </section>
      ) : null}

      {data.transport ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-transport">Transport</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Livraisons du jour" value={String(data.transport.todayCount)} tone="transport" />
            <StatCard label="CA transport" value={formatGnf(data.transport.revenue)} tone="transport" />
            <StatCard label="Amortissement jour" value={formatGnf(data.transport.amortization)} tone="transport" />
            <StatCard label="Motos" value={String(data.transport.motorcycleCount)} tone="transport" />
            <StatCard
              label="Prochaine moto"
              value={`${formatNumber(data.transport.progress.percent, 2)} %`}
              hint={`${formatGnf(data.transport.progress.fund)} / ${formatGnf(data.transport.progress.target)}`}
              tone="transport"
            />
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-transport"
              style={{ width: `${Math.min(100, Number(data.transport.progress.percent))}%` }}
            />
          </div>
        </section>
      ) : null}

      {data.global ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Global</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="CA Café" value={formatGnf(data.global.cafe)} tone="cafe" />
            <StatCard label="CA Eau" value={formatGnf(data.global.water)} tone="eau" />
            <StatCard label="CA Lipton" value={formatGnf(data.global.lipton ?? "0")} tone="lipton" />
            <StatCard label="CA Transport" value={formatGnf(data.global.transport)} tone="transport" />
            <StatCard label="CA total" value={formatGnf(data.global.total)} tone="success" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
