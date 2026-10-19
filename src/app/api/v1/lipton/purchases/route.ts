import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createLiptonPurchase, listLiptonPurchases, liptonPurchaseSchema } from "@/server/lipton/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.purchases.access, async () => {
    return json(serialize(await listLiptonPurchases(parseListFilters(new URL(request.url)))));
  });
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.purchases.access, async (user) => {
    const body = liptonPurchaseSchema.parse(await request.json());
    return json(serialize(await createLiptonPurchase(user.sub, body)), 201);
  });
}
