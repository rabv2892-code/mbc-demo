import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { riderSchema, updateRider } from "@/server/transport/service";
import { serialize } from "@/server/query";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(PERMISSIONS.transport.admin, async (user) => {
    const { id } = await ctx.params;
    const body = riderSchema.parse(await request.json());
    return json(serialize(await updateRider(user.sub, id, body)));
  });
}
