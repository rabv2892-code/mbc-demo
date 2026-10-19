"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { downloadExport } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  exportModule?: string;
  users?: Array<{ id: string; fullName: string }>;
  userFilterKey?: keyof T;
  onFilterChange?: (filters: { q: string; from: string; to: string; employeeId: string }) => void;
  searchKeys?: Array<(row: T) => string>;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  exportModule,
  users,
  onFilterChange,
  searchKeys,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filtered = useMemo(() => {
    let list = rows;
    if (q && searchKeys) {
      const needle = q.toLowerCase();
      list = list.filter((row) => searchKeys.some((fn) => fn(row).toLowerCase().includes(needle)));
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      list = [...list].sort((a, b) => {
        const av = col?.sortValue?.(a) ?? "";
        const bv = col?.sortValue?.(b) ?? "";
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [rows, q, searchKeys, sortKey, sortDir, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function applyRemote() {
    onFilterChange?.({ q, from, to, employeeId });
    setPage(1);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="min-w-48 flex-1">
          <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Recherche</p>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer le tableau…" />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Du</p>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Au</p>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {users ? (
          <div className="min-w-40">
            <p className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Utilisateur</p>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Tous</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {onFilterChange ? (
          <Button type="button" variant="secondary" onClick={applyRemote}>
            Appliquer
          </Button>
        ) : null}
        {exportModule ? (
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => downloadExport(exportModule, "xlsx", { q, from, to, employeeId })}>
              Excel
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => downloadExport(exportModule, "csv", { q, from, to, employeeId })}>
              CSV
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="table-excel min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("cursor-pointer whitespace-nowrap px-3 py-2.5 font-semibold", col.className)}
                  onClick={() => {
                    if (sortKey === col.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortKey(col.key);
                      setSortDir("asc");
                    }
                  }}
                >
                  {col.header}
                  {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-slate-500">
                  Aucune ligne
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr key={row.id} className={i % 2 ? "bg-slate-50/70" : "bg-white"}>
                  {columns.map((col) => (
                    <td key={col.key} className={cn("whitespace-nowrap px-3 py-2.5 text-slate-800", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {filtered.length} ligne(s) — page {page}/{pages}
        </span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
