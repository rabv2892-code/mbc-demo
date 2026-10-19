import { json, withAuth } from "@/server/api";
import { PERMISSIONS } from "@/server/rbac";
import { addMotorcycleExpense, motorcycleExpenseSchema } from "@/server/transport/service";
import { serialize } from "@/server/query";

export async function POST(request: Request) {
  return withAuth(PERMISSIONS.transport.admin, async (user) => {
    const body = motorcycleExpenseSchema.parse(await request.json());
    return json(serialize(await addMotorcycleExpense(user.sub, body)), 201);
  });
}
