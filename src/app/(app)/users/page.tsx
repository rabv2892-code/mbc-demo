"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { ROLE_LABELS, type Role } from "@/lib/rbac";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
};

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [form, setForm] = useState({ email: "", fullName: "", password: "", role: "ADMIN_CAFE" as Role });
  const [error, setError] = useState("");

  async function load() {
    setRows(await api<User[]>("/api/v1/users"));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ email: "", fullName: "", password: "", role: "ADMIN_CAFE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const columns: Column<User>[] = [
    { key: "name", header: "Nom", render: (r) => r.fullName },
    { key: "email", header: "Email", render: (r) => r.email },
    { key: "role", header: "Rôle", render: (r) => ROLE_LABELS[r.role] },
    { key: "active", header: "Actif", render: (r) => (r.isActive ? "Oui" : "Non") },
    {
      key: "act",
      header: "",
      render: (r) => (
        <div className="flex gap-2">
          <Select
            value={r.role}
            onChange={async (e) => {
              setError("");
              try {
                await api(`/api/v1/users/${r.id}`, { method: "PATCH", body: JSON.stringify({ role: e.target.value }) });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Erreur");
              }
              await load();
            }}
          >
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN_CAFE">Vendeur café</option>
            <option value="MOTARD">Livreur</option>
          </Select>
          <Button
            type="button"
            size="sm"
            variant={r.isActive ? "danger" : "secondary"}
            onClick={async () => {
              setError("");
              try {
                await api(`/api/v1/users/${r.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !r.isActive }) });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Erreur");
              }
              await load();
            }}
          >
            {r.isActive ? "Désactiver" : "Activer"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Utilisateurs" subtitle="Création, rôles et désactivation." />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Nom"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
            <Field label="Mot de passe">
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={12} />
            </Field>
            <Field label="Rôle">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN_CAFE">Vendeur café</option>
                <option value="MOTARD">Livreur</option>
              </Select>
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full">Créer l&apos;utilisateur</Button>
          </form>
        </Card>
        <DataTable rows={rows} columns={columns} searchKeys={[(r) => r.fullName, (r) => r.email, (r) => r.role]} />
      </div>
    </div>
  );
}
