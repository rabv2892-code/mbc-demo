import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { getDashboard } from "@/server/dashboard/service";

export async function GET() {
  return withAuth(PERMISSIONS.dashboard.access, async (user) => {
    return json(await getDashboard(user.role, user.sub));
  });
}
