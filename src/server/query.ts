export function parseListFilters(url: URL) {
  const q = url.searchParams.get("q") || undefined;
  const employeeId = url.searchParams.get("employeeId") || undefined;
  const riderId = url.searchParams.get("riderId") || undefined;
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  return {
    q,
    employeeId,
    riderId,
    from: fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : undefined,
    to: toRaw ? new Date(`${toRaw}T23:59:59.999Z`) : undefined,
  };
}

export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === "object" && v !== null && typeof v.toFixed === "function" && typeof v.toNumber === "function") {
        return v.toString();
      }
      return v;
    }),
  );
}
