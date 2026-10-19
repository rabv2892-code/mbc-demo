import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { createMachine, listMachines, machineSchema } from "@/server/machines/service";
import { serialize } from "@/server/query";

export async function GET() {
  return withAuth(PERMISSIONS.catalog.manage, async () => json(serialize(await listMachines())));
}

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.catalog.manage, async (user) => {
    const body = machineSchema.parse(await request.json());
    return json(serialize(await createMachine(user.sub, body)), 201);
  });
}
