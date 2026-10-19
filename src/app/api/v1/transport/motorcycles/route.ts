import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createMotorcycle, listMotorcycles, motorcycleSchema } from "@/server/transport/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.transport.admin, async () => json(serialize(await listMotorcycles())));
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.transport.admin, async (user) => {
    const body = motorcycleSchema.parse(await request.json());
    return json(serialize(await createMotorcycle(user.sub, body)), 201);
  });
}
