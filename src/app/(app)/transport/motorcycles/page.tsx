"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { formatGnf } from "@/lib/money";
import { formatDate } from "@/lib/timezone";

type Moto = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  ownership?: "OWNED" | "PARTNER";
  ownerName?: string | null;
  purchaseDate: string;
  purchasePrice: string;
  insuranceFee: string;
  registrationFee: string;
  equipmentFee: string;
  maintenanceFee: string;
  otherFees: string;
  totalCost: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
};

const empty = {
  plate: "",
  brand: "",
  model: "",
  ownership: "OWNED" as "OWNED" | "PARTNER",
  ownerName: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchasePrice: "0",
  insuranceFee: "0",
  registrationFee: "0",
  equipmentFee: "0",
  maintenanceFee: "0",
  otherFees: "0",
  status: "ACTIVE" as Moto["status"],
};

export default function MotorcyclesPage() {
  const [rows, setRows] = useState<Moto[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [expense, setExpense] = useState({ motorcycleId: "", label: "", amount: "" });
  const [error, setError] = useState("");

  async function load() {
    setRows(await api<Moto[]>("/api/v1/transport/motorcycles"));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        purchasePrice: Number(form.purchasePrice),
        insuranceFee: Number(form.insuranceFee),
        registrationFee: Number(form.registrationFee),
        equipmentFee: Number(form.equipmentFee),
        maintenanceFee: Number(form.maintenanceFee),
        otherFees: Number(form.otherFees),
      };
      if (editing) {
        await api(`/api/v1/transport/motorcycles/${editing}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/v1/transport/motorcycles", { method: "POST", body: JSON.stringify(payload) });
      }
      setForm(empty);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/v1/transport/motorcycles/expenses", {
      method: "POST",
      body: JSON.stringify({ ...expense, amount: Number(expense.amount) }),
    });
    setExpense({ motorcycleId: "", label: "", amount: "" });
    await load();
  }

  const columns: Column<Moto>[] = [
    { key: "plate", header: "Immat.", render: (r) => r.plate },
    { key: "own", header: "Propriété", render: (r) => (r.ownership === "PARTNER" ? `Partenaire${r.ownerName ? ` (${r.ownerName})` : ""}` : "À moi") },
    { key: "brand", header: "Marque", render: (r) => `${r.brand} ${r.model}` },
    { key: "date", header: "Achat", render: (r) => formatDate(r.purchaseDate) },
    { key: "price", header: "Prix", render: (r) => formatGnf(r.purchasePrice) },
    { key: "total", header: "Coût total", render: (r) => formatGnf(r.totalCost) },
    { key: "status", header: "Statut", render: (r) => r.status },
    {
      key: "act",
      header: "",
      render: (r) => (
        <Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(r.id); setForm({ ...r, ownership: r.ownership ?? "OWNED", ownerName: r.ownerName ?? "", purchaseDate: r.purchaseDate.slice(0, 10) }); }}>
          Modifier
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Motos" subtitle="Vos motos s'amortissent à chaque livraison. Les motos partenaires sont suivies sans amortissement." />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-xl">{editing ? "Modifier la moto" : "Nouvelle moto"}</h2>
            <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Immatriculation"><Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} required /></Field>
              <Field label="Marque"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required /></Field>
              <Field label="Modèle"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></Field>
              <Field label="Propriété">
                <Select value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value as "OWNED" | "PARTNER" })}>
                  <option value="OWNED">Moto à moi</option>
                  <option value="PARTNER">Moto qui ne m&apos;appartient pas</option>
                </Select>
              </Field>
              {form.ownership === "PARTNER" ? (
                <Field label="Propriétaire"><Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></Field>
              ) : null}
              <Field label="Date d'achat"><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
              <Field label="Prix d'achat"><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></Field>
              <Field label="Assurance"><Input type="number" value={form.insuranceFee} onChange={(e) => setForm({ ...form, insuranceFee: e.target.value })} /></Field>
              <Field label="Immatriculation"><Input type="number" value={form.registrationFee} onChange={(e) => setForm({ ...form, registrationFee: e.target.value })} /></Field>
              <Field label="Équipement"><Input type="number" value={form.equipmentFee} onChange={(e) => setForm({ ...form, equipmentFee: e.target.value })} /></Field>
              <Field label="Entretien"><Input type="number" value={form.maintenanceFee} onChange={(e) => setForm({ ...form, maintenanceFee: e.target.value })} /></Field>
              <Field label="Autres"><Input type="number" value={form.otherFees} onChange={(e) => setForm({ ...form, otherFees: e.target.value })} /></Field>
              <Field label="Statut">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Moto["status"] })}>
                  <option value="ACTIVE">Active</option>
                  <option value="MAINTENANCE">Entretien</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </Field>
              {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="col-span-2">{editing ? "Mettre à jour" : "Enregistrer"}</Button>
            </form>
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-lg">Dépense moto</h2>
            <form onSubmit={addExpense} className="mt-3 space-y-3">
              <Field label="Moto">
                <Select value={expense.motorcycleId} onChange={(e) => setExpense({ ...expense, motorcycleId: e.target.value })} required>
                  <option value="">Choisir</option>
                  {rows.map((m) => <option key={m.id} value={m.id}>{m.plate}</option>)}
                </Select>
              </Field>
              <Field label="Libellé"><Input value={expense.label} onChange={(e) => setExpense({ ...expense, label: e.target.value })} required /></Field>
              <Field label="Montant"><Input type="number" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} required /></Field>
              <Button type="submit" className="w-full">Ajouter la dépense</Button>
            </form>
          </Card>
        </div>
        <DataTable rows={rows} columns={columns} searchKeys={[(r) => r.plate, (r) => r.brand, (r) => r.model]} />
      </div>
    </div>
  );
}
