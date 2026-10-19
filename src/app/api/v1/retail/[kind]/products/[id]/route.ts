import { NextResponse } from "next/server";
import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { retailProductSchema, updateRetailProduct } from "@/server/retail/service";
import { parseKind } from "@/server/retail/kind";
import { serialize } from "@/server/query";

export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  return withAuth(PERMISSIONS.catalog.manage, async (user) => {
    const { kind: raw, id } = await params;
    const kind = parseKind(raw);
    if (!kind) return NextResponse.json({ error: "Module inconnu" }, { status: 404 });
    const body = retailProductSchema.parse(await request.json());
    return json(serialize(await updateRetailProduct(user.sub, id, kind, body)));
  });
}
