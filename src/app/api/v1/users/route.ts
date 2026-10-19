import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createUser, createUserSchema, listUsers } from "@/server/users/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.users.manage, async () => json(serialize(await listUsers())));
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.users.manage, async (user) => {
    const body = createUserSchema.parse(await request.json());
    const created = await createUser(user.sub, body);
    return json(
      {
        id: created.id,
        email: created.email,
        fullName: created.fullName,
        role: created.role,
        isActive: created.isActive,
      },
      201,
    );
  });
}
