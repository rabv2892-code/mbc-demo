import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { buildReport, reportQuerySchema } from "@/server/reports/service";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.reports.access, async () => {
    const url = new URL(request.url);
    const query = reportQuerySchema.parse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    const from = new Date(`${query.from}T00:00:00.000Z`);
    const to = new Date(`${query.to}T23:59:59.999Z`);
    return json(await buildReport(from, to));
  });
}
