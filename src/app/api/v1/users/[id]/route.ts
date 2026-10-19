import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { updateUser, updateUserSchema } from "@/server/users/service";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(PERMISSIONS.users.manage, async (user) => {
    const { id } = await ctx.params;
    const body = updateUserSchema.parse(await request.json());
    const updated = await updateUser(user.sub, id, body);
    return json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      isActive: updated.isActive,
    });
  });
}
