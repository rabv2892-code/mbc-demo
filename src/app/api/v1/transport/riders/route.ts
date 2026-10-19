import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createRider, listRiders, riderSchema } from "@/server/transport/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.transport.admin, async () => json(serialize(await listRiders())));
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.transport.admin, async (user) => {
    const body = riderSchema.parse(await request.json());
    return json(serialize(await createRider(user.sub, body)), 201);
  });
}
