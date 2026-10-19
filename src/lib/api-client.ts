export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erreur API");
  }
  return data as T;
}

export function downloadExport(module: string, format: "xlsx" | "csv", params?: Record<string, string>) {
  const qs = new URLSearchParams({ module, format, ...params });
  window.location.href = `/api/v1/export?${qs.toString()}`;
}
