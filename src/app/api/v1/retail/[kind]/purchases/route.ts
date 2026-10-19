import { NextResponse } from "next/server";
import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createRetailPurchase, listRetailPurchases, retailPurchaseSchema } from "@/server/retail/service";
import { parseKind } from "@/server/retail/kind";
import { parseListFilters, serialize } from "@/server/query";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  return withAuth(PERMISSIONS.purchases.access, async () => {
    const kind = parseKind((await params).kind);
    if (!kind) return NextResponse.json({ error: "Module inconnu" }, { status: 404 });
    return json(serialize(await listRetailPurchases(kind, parseListFilters(new URL(request.url)))));
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  return withAuth(PERMISSIONS.purchases.access, async (user) => {
    const kind = parseKind((await params).kind);
    if (!kind) return NextResponse.json({ error: "Module inconnu" }, { status: 404 });
    const body = retailPurchaseSchema.parse(await request.json());
    return json(serialize(await createRetailPurchase(user.sub, kind, body)), 201);
  });
}
