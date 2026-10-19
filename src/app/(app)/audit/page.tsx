"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { api } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/timezone";

type Log = {
  id: string;
  action: string;
  module: string;
  occurredAt: string;
  oldValue: unknown;
  newValue: unknown;
  user: { fullName: string; role: string };
};

export default function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async (params = "") => {
    setRows(await api<Log[]>(`/api/v1/audit${params}`));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const columns: Column<Log>[] = [
    { key: "date", header: "Date", render: (r) => formatDate(r.occurredAt) },
    { key: "time", header: "Heure", render: (r) => formatTime(r.occurredAt) },
    { key: "user", header: "Utilisateur", render: (r) => `${r.user.fullName} (${r.user.role})` },
    { key: "module", header: "Module", render: (r) => r.module },
    { key: "action", header: "Action", render: (r) => r.action },
    { key: "old", header: "Ancienne valeur", render: (r) => (r.oldValue ? JSON.stringify(r.oldValue) : "—") },
    { key: "new", header: "Nouvelle valeur", render: (r) => (r.newValue ? JSON.stringify(r.newValue) : "—") },
  ];

  return (
    <div>
      <PageHeader title="Historique" subtitle="Audit des opérations sensibles." />
      {error ? <p className="text-red-600">{error}</p> : null}
      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={[(r) => r.action, (r) => r.module, (r) => r.user.fullName]}
        onFilterChange={(f) => {
          const qs = new URLSearchParams();
          if (f.q) qs.set("q", f.q);
          if (f.from) qs.set("from", f.from);
          if (f.to) qs.set("to", f.to);
          if (f.employeeId) qs.set("employeeId", f.employeeId);
          load(`?${qs}`).catch((e) => setError(e.message));
        }}
      />
    </div>
  );
}
