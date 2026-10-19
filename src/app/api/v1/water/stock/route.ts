import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { getWaterStock } from "@/server/water/stock";

export async function GET() {
  return withAuth(PERMISSIONS.purchases.access, async () => json(await getWaterStock()));
}
