import { db } from "@/lib/db";
import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.audit.access, async () => {
    const filters = parseListFilters(new URL(request.url));
    const moduleName = new URL(request.url).searchParams.get("module") || undefined;
    const logs = await db.auditLog.findMany({
      where: {
        userId: filters.employeeId,
        module: moduleName,
        occurredAt: { gte: filters.from, lte: filters.to },
        OR: filters.q
          ? [
              { action: { contains: filters.q, mode: "insensitive" } },
              { module: { contains: filters.q, mode: "insensitive" } },
              { user: { fullName: { contains: filters.q, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: { user: { select: { id: true, fullName: true, role: true } } },
      orderBy: { occurredAt: "desc" },
      take: 500,
    });
    return json(serialize(logs));
  });
}
