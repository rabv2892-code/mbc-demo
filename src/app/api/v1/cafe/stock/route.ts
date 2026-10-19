import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { getCoffeeStock } from "@/server/cafe/stock";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.purchases.access, async () => json(serialize(await getCoffeeStock())));
}
