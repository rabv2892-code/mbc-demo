import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { getLiptonStock } from "@/server/lipton/stock";

export async function GET() {
  return withAuth(PERMISSIONS.purchases.access, async () => json(await getLiptonStock()));
}
