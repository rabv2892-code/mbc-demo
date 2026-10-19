import { db } from "@/lib/db";
import { json, withAuth } from "@/server/api";

export async function GET() {
  return withAuth(["SUPER_ADMIN", "ADMIN_CAFE"], async () => {
    const users = await db.user.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", "ADMIN_CAFE"] } },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    });
    return json(users);
  });
}
