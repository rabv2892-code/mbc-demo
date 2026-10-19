import { NextResponse } from "next/server";
import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createRetailProduct, listRetailProducts, retailProductSchema } from "@/server/retail/service";
import { parseKind } from "@/server/retail/kind";
import { serialize } from "@/server/query";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  return withAuth(PERMISSIONS.cafe.access, async () => {
    const kind = parseKind((await params).kind);
    if (!kind) return NextResponse.json({ error: "Module inconnu" }, { status: 404 });
    return json(serialize(await listRetailProducts(kind)));
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  return withAuth(PERMISSIONS.catalog.manage, async (user) => {
    const kind = parseKind((await params).kind);
    if (!kind) return NextResponse.json({ error: "Module inconnu" }, { status: 404 });
    const body = retailProductSchema.parse(await request.json());
    return json(serialize(await createRetailProduct(user.sub, kind, body)), 201);
  });
}
