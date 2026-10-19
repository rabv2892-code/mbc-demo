import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createLiptonSale, listLiptonSales, previewLiptonSale, liptonSaleSchema } from "@/server/lipton/service";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request) {
  return withAuth(PERMISSIONS.lipton.access, async () => {
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "1") {
      return json(await previewLiptonSale(Number(url.searchParams.get("quantity") || 0)));
    }
    return json(serialize(await listLiptonSales(parseListFilters(url))));
  });
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.lipton.access, async (user) => {
    const raw = await request.json();
    const body = liptonSaleSchema.parse({ quantity: raw.quantity });
    return json(serialize(await createLiptonSale(user.sub, body)), 201);
  });
}
