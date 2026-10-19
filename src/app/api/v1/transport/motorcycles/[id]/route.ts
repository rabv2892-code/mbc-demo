import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { motorcycleSchema, updateMotorcycle } from "@/server/transport/service";
import { serialize } from "@/server/query";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(PERMISSIONS.transport.admin, async (user) => {
    const { id } = await ctx.params;
    const body = motorcycleSchema.parse(await request.json());
    return json(serialize(await updateMotorcycle(user.sub, id, body)));
  });
}
