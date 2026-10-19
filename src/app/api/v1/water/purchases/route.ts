import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createWaterPurchase, listWaterPurchases, waterPurchaseSchema } from "@/server/water/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.purchases.access, async () => {
    return json(serialize(await listWaterPurchases(parseListFilters(new URL(request.url)))));
  });
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.purchases.access, async (user) => {
    const body = waterPurchaseSchema.parse(await request.json());
    return json(serialize(await createWaterPurchase(user.sub, body)), 201);
  });
}
