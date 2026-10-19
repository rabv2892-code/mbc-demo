"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { formatGnf } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/timezone";

type Delivery = {
  id: string;
  client: string;
  origin: string;
  destination: string;
  amount: string;
  occurredAt: string;
  rider: { id: string; fullName: string };
  employee: { fullName: string };
  amortization?: { amount: string };
};

type Rider = { id: string; fullName: string; isActive: boolean };

export default function DeliveriesPage() {
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [form, setForm] = useState({ riderId: "", client: "", origin: "", destination: "", amount: "", comment: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const isLivreur = role === "MOTARD";
  const isAdmin = role === "SUPER_ADMIN";

  const load = useCallback(async (params = "") => {
    const path = isLivreur ? `/api/v1/transport/my-deliveries${params}` : `/api/v1/transport/deliveries${params}`;
    setRows(await api<Delivery[]>(path));
  }, [isLivreur]);

  useEffect(() => {
    api<{ role: string }>("/api/v1/auth/me")
      .then((u) => setRole(u.role))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!role) return;
    load().catch((e) => setError(e.message));
    if (isAdmin) {
      api<Rider[]>("/api/v1/transport/riders").then(setRiders).catch(() => undefined);
    }
  }, [role, isAdmin, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api("/api/v1/transport/my-deliveries", {
        method: "POST",
        body: JSON.stringify({
          riderId: isAdmin ? form.riderId : undefined,
          client: form.client,
          origin: form.origin,
          destination: form.destination,
          amount: Number(form.amount),
          comment: form.comment || undefined,
        }),
      });
      setOk("Livraison enregistrée");
      setForm({ riderId: form.riderId, client: "", origin: "", destination: "", amount: "", comment: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<Delivery>[] = [
    { key: "date", header: "Date", render: (r) => `${formatDate(r.occurredAt)} ${formatTime(r.occurredAt)}` },
    { key: "client", header: "Client", render: (r) => r.client },
    { key: "from", header: "Départ", render: (r) => r.origin },
    { key: "to", header: "Destination", render: (r) => r.destination },
    { key: "amount", header: "Montant", render: (r) => formatGnf(r.amount) },
    ...(isAdmin
      ? [
          { key: "amort", header: "Amortissement", render: (r: Delivery) => formatGnf(r.amortization?.amount ?? 0) },
          { key: "rider", header: "Livreur", render: (r: Delivery) => r.rider.fullName },
          { key: "user", header: "Utilisateur", render: (r: Delivery) => r.employee.fullName },
        ]
      : []),
  ];

  if (!role) {
    return error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-slate-500">Chargement…</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Livraisons"
        subtitle={isLivreur ? "Ajoutez le montant de vos courses. Vous ne voyez que les vôtres." : "Toutes les courses."}
      />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            {isAdmin ? (
              <Field label="Livreur">
                <Select value={form.riderId} onChange={(e) => setForm({ ...form, riderId: e.target.value })} required>
                  <option value="">Choisir</option>
                  {riders.filter((r) => r.isActive).map((r) => (
                    <option key={r.id} value={r.id}>{r.fullName}</option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label="Client"><Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} required /></Field>
            <Field label="Départ"><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} required /></Field>
            <Field label="Destination"><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required /></Field>
            <Field label="Montant"><Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
            <Field label="Commentaire"><Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        </Card>
        <DataTable
          rows={rows}
          columns={columns}
          exportModule={isAdmin ? "deliveries" : undefined}
          searchKeys={[(r) => r.client, (r) => r.rider.fullName, (r) => r.origin, (r) => r.destination]}
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
