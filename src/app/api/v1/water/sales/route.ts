import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createWaterSale, listWaterSales, previewWaterSale, waterSaleSchema } from "@/server/water/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.water.access, async () => {
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "1") {
      return json(await previewWaterSale(Number(url.searchParams.get("quantity") || 0)));
    }
    return json(serialize(await listWaterSales(parseListFilters(url))));
  });
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.water.access, async (user) => {
    const raw = await request.json();
    const body = waterSaleSchema.parse({ quantity: raw.quantity });
    return json(serialize(await createWaterSale(user.sub, body)), 201);
  });
}
