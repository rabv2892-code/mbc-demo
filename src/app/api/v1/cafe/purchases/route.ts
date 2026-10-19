import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { coffeePurchaseSchema, createCoffeePurchase, listCoffeePurchases } from "@/server/cafe/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.purchases.access, async () => {
    const filters = parseListFilters(new URL(request.url));
    return json(serialize(await listCoffeePurchases(filters)));
  });
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.purchases.access, async (user) => {
    const body = coffeePurchaseSchema.parse(await request.json());
    return json(serialize(await createCoffeePurchase(user.sub, body)), 201);
  });
}
