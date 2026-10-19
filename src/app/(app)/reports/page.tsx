"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { formatGnf } from "@/lib/money";
import { formatDate } from "@/lib/timezone";

type Report = {
  from: string;
  to: string;
  cafe: { salesCount: number; cups: number; revenue: number; cost: number; profit: number; purchaseCost: number };
  water: { sold: number; revenue: number; purchased: number; purchaseCost: number; offered: number; stock: number };
  lipton?: { sold: number; revenue: number; purchased: number; purchaseCost: number; stock: number };
  transport: { deliveries: number; revenue: number; amortization: number };
  totals: { revenue: number; costs: number; profit: number };
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(isoDate(today));
  const [to, setTo] = useState(isoDate(today));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  function preset(kind: "day" | "week" | "month" | "year") {
    const end = new Date();
    const start = new Date();
    if (kind === "week") start.setDate(end.getDate() - 6);
    if (kind === "month") start.setDate(1);
    if (kind === "year") {
      start.setMonth(0);
      start.setDate(1);
    }
    setFrom(isoDate(start));
    setTo(isoDate(end));
  }

  async function load() {
    setError("");
    try {
      setReport(await api<Report>(`/api/v1/reports?from=${from}&to=${to}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function exportPdf() {
    if (!report) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Marouane Business Center — Rapport", 14, 18);
    doc.setFontSize(10);
    doc.text(`${formatDate(report.from)} → ${formatDate(report.to)}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [["Indicateur", "Valeur"]],
      body: [
        ["CA Café", formatGnf(report.cafe.revenue)],
        ["Bénéfice café", formatGnf(report.cafe.profit)],
        ["CA Eau", formatGnf(report.water.revenue)],
        ["CA Lipton", formatGnf(report.lipton?.revenue ?? 0)],
        ["CA Transport", formatGnf(report.transport.revenue)],
        ["Amortissement", formatGnf(report.transport.amortization)],
        ["CA total", formatGnf(report.totals.revenue)],
      ],
    });
    doc.save(`rapport-mbc-${from}-${to}.pdf`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Rapports" subtitle="Journalier, hebdomadaire, mensuel, annuel ou période libre." />
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="Du"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Au"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Button type="button" onClick={load}>Générer</Button>
        <Button type="button" variant="secondary" onClick={() => preset("day")}>Jour</Button>
        <Button type="button" variant="secondary" onClick={() => preset("week")}>Semaine</Button>
        <Button type="button" variant="secondary" onClick={() => preset("month")}>Mois</Button>
        <Button type="button" variant="secondary" onClick={() => preset("year")}>Année</Button>
        {report ? <Button type="button" variant="secondary" onClick={exportPdf}>Export PDF</Button> : null}
      </Card>
      {error ? <p className="text-red-600">{error}</p> : null}
      {report ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="CA Café" value={formatGnf(report.cafe.revenue)} tone="cafe" />
            <StatCard label="Bénéfice café" value={formatGnf(report.cafe.profit)} tone="success" />
            <StatCard label="CA Eau" value={formatGnf(report.water.revenue)} tone="eau" />
            <StatCard label="CA Lipton" value={formatGnf(report.lipton?.revenue ?? 0)} tone="lipton" />
            <StatCard label="CA Transport" value={formatGnf(report.transport.revenue)} tone="transport" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Tasses" value={String(report.cafe.cups)} />
            <StatCard label="Coût café" value={formatGnf(report.cafe.cost)} />
            <StatCard label="Eau offerte" value={String(report.water.offered)} tone="eau" />
            <StatCard label="Amortissement" value={formatGnf(report.transport.amortization)} tone="transport" />
          </div>
          <Card className="p-6 text-sm text-slate-600">
            CA total {formatGnf(report.totals.revenue)} · coûts {formatGnf(report.totals.costs)} · livraisons {report.transport.deliveries}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
