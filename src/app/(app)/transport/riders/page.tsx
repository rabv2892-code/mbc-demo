"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";

type Rider = {
  id: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  userId?: string;
  user?: { email: string };
  motorcycle?: { plate: string };
  _count: { deliveries: number };
};

type User = { id: string; fullName: string; role: string; isActive: boolean };
type Moto = { id: string; plate: string };

export default function RidersPage() {
  const [rows, setRows] = useState<Rider[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [motos, setMotos] = useState<Moto[]>([]);
  const [form, setForm] = useState({ fullName: "", phone: "", userId: "", motorcycleId: "", isActive: true });
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [riders, userList, motoList] = await Promise.all([
      api<Rider[]>("/api/v1/transport/riders"),
      api<User[]>("/api/v1/users"),
      api<Moto[]>("/api/v1/transport/motorcycles"),
    ]);
    setRows(riders);
    setUsers(userList.filter((u) => u.role === "MOTARD"));
    setMotos(motoList);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      fullName: form.fullName,
      phone: form.phone || undefined,
      userId: form.userId || null,
      motorcycleId: form.motorcycleId || null,
      isActive: form.isActive,
    };
    try {
      if (editing) await api(`/api/v1/transport/riders/${editing}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/api/v1/transport/riders", { method: "POST", body: JSON.stringify(payload) });
      setForm({ fullName: "", phone: "", userId: "", motorcycleId: "", isActive: true });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<Rider>[] = [
    { key: "name", header: "Nom", render: (r) => r.fullName },
    { key: "phone", header: "Téléphone", render: (r) => r.phone || "—" },
    { key: "user", header: "Compte", render: (r) => r.user?.email || "—" },
    { key: "moto", header: "Moto", render: (r) => r.motorcycle?.plate || "—" },
    { key: "del", header: "Livraisons", render: (r) => r._count.deliveries },
    { key: "active", header: "Actif", render: (r) => (r.isActive ? "Oui" : "Non") },
    {
      key: "act",
      header: "",
      render: (r) => (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => {
            setEditing(r.id);
            setForm({ fullName: r.fullName, phone: r.phone || "", userId: r.userId || "", motorcycleId: "", isActive: r.isActive });
          }}>Modifier</Button>
          {r.isActive ? (
            <Button type="button" size="sm" variant="danger" onClick={async () => {
              await api(`/api/v1/transport/riders/${r.id}`, { method: "PATCH", body: JSON.stringify({ fullName: r.fullName, isActive: false }) });
              await load();
            }}>Désactiver</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Livreurs" subtitle="Associez un compte Livreur pour l'accès à la page Livraisons." />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Nom"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Compte utilisateur">
              <Select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Aucun</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Moto">
              <Select value={form.motorcycleId} onChange={(e) => setForm({ ...form, motorcycleId: e.target.value })}>
                <option value="">Aucune</option>
                {motos.map((m) => <option key={m.id} value={m.id}>{m.plate}</option>)}
              </Select>
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full">{editing ? "Mettre à jour" : "Ajouter"}</Button>
          </form>
        </Card>
        <DataTable rows={rows} columns={columns} searchKeys={[(r) => r.fullName, (r) => r.user?.email || ""]} />
      </div>
    </div>
  );
}
