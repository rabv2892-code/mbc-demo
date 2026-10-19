import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import {
  createSupplyPurchase,
  getAllSupplyStock,
  listSupplyPurchases,
  supplyPurchaseSchema,
} from "@/server/supplies/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.catalog.manage, async () => {
    const url = new URL(request.url);
    if (url.searchParams.get("stock") === "1") {
      return json(await getAllSupplyStock());
    }
    return json(serialize(await listSupplyPurchases(parseListFilters(url))));
  });
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.catalog.manage, async (user) => {
    const body = supplyPurchaseSchema.parse(await request.json());
    return json(serialize(await createSupplyPurchase(user.sub, body)), 201);
  });
}
