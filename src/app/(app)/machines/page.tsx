"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { formatGnf } from "@/lib/money";
import { formatDate } from "@/lib/timezone";

type Machine = {
  id: string;
  name: string;
  purchaseDate: string;
  purchasePrice: string;
  usefulLifeMonths: number;
  monthly: string;
  elapsedMonths: number;
  amortized: string;
  remaining: string;
  percent: string;
  notes?: string;
};

export default function MachinesPage() {
  const [rows, setRows] = useState<Machine[]>([]);
  const [name, setName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState("");
  const [usefulLifeMonths, setUsefulLifeMonths] = useState("24");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setRows(await api<Machine[]>("/api/v1/machines"));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api("/api/v1/machines", {
        method: "POST",
        body: JSON.stringify({
          name,
          purchaseDate,
          purchasePrice: Number(purchasePrice),
          usefulLifeMonths: Number(usefulLifeMonths),
          notes,
        }),
      });
      setOk("Machine enregistrée — amortissement mensuel calculé automatiquement");
      setName("");
      setPurchasePrice("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<Machine>[] = [
    { key: "name", header: "Machine", render: (r) => r.name },
    { key: "date", header: "Achat", render: (r) => formatDate(r.purchaseDate) },
    { key: "price", header: "Prix", render: (r) => formatGnf(r.purchasePrice) },
    { key: "life", header: "Durée", render: (r) => `${r.usefulLifeMonths} mois` },
    { key: "month", header: "Par mois", render: (r) => formatGnf(r.monthly) },
    { key: "done", header: "Amorti", render: (r) => `${formatGnf(r.amortized)} (${Number(r.percent).toFixed(0)} %)` },
    { key: "left", header: "Reste", render: (r) => formatGnf(r.remaining) },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Machines"
        subtitle="Prix d'achat ÷ nombre de mois = amortissement mensuel. Le reste diminue tout seul avec le temps."
      />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Nom de la machine">
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Machine à café" />
            </Field>
            <Field label="Date d'achat">
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </Field>
            <Field label="Prix d'achat (GNF)">
              <Input type="number" min={1} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required />
            </Field>
            <Field label="Durée d'amortissement (mois)">
              <Input type="number" min={1} value={usefulLifeMonths} onChange={(e) => setUsefulLifeMonths(e.target.value)} required />
            </Field>
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {purchasePrice && usefulLifeMonths ? (
              <p className="text-sm text-slate-600">
                Amortissement mensuel : <strong>{formatGnf(Number(purchasePrice) / Number(usefulLifeMonths || 1))}</strong>
              </p>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        </Card>
        <DataTable rows={rows} columns={columns} searchKeys={[(r) => r.name]} />
      </div>
    </div>
  );
}
