import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { amortizationSummary } from "@/server/transport/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.transport.admin, async () => json(serialize(await amortizationSummary())));
}
