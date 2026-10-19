import { NextResponse } from "next/server";
import { RetailUnit } from "@prisma/client";
import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createRetailSale, listRetailSales, previewRetailSale, retailSaleSchema } from "@/server/retail/service";
import { parseKind } from "@/server/retail/kind";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  return withAuth(PERMISSIONS.cafe.access, async () => {
    const kind = parseKind((await params).kind);
    if (!kind) return NextResponse.json({ error: "Module inconnu" }, { status: 404 });
    const url = new URL(request.url);
    if (url.searchParams.get("preview") === "1") {
      const productId = url.searchParams.get("productId") || "";
      if (!productId) return json({ unitPrice: "0", totalAmount: "0", pieceQuantity: 0, stockCurrent: 0 });
      const unit = (url.searchParams.get("unit") || "PIECE") as RetailUnit;
      return json(
        await previewRetailSale(kind, productId, unit === "PACK" ? "PACK" : "PIECE", Number(url.searchParams.get("quantity") || 0)),
      );
    }
    return json(serialize(await listRetailSales(kind, parseListFilters(url))));
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  return withAuth(PERMISSIONS.cafe.access, async (user) => {
    const kind = parseKind((await params).kind);
    if (!kind) return NextResponse.json({ error: "Module inconnu" }, { status: 404 });
    const body = retailSaleSchema.parse(await request.json());
    return json(serialize(await createRetailSale(user.sub, kind, body)), 201);
  });
}
