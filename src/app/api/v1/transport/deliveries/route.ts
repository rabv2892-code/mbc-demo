import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { listDeliveries } from "@/server/transport/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.transport.admin, async () => {
    return json(serialize(await listDeliveries(parseListFilters(new URL(request.url)))));
  });
}
