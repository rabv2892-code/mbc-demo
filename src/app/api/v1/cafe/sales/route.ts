import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { coffeeSaleSchema, createCoffeeSale, listCoffeeSales, previewCoffeeSale } from "@/server/cafe/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.cafe.access, async () => {
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "1") {
      const quantity = Number(url.searchParams.get("quantity") || 0);
      return json(await previewCoffeeSale(quantity));
    }
    return json(serialize(await listCoffeeSales(parseListFilters(url))));
  });
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.cafe.access, async (user) => {
    const raw = await request.json();
    const body = coffeeSaleSchema.parse({ quantity: raw.quantity });
    return json(serialize(await createCoffeeSale(user.sub, body)), 201);
  });
}
