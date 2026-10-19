import { json, withAuth } from "@/server/api";

export async function GET() {
  return withAuth(["SUPER_ADMIN", "ADMIN_CAFE", "MOTARD"], async (user) => {
    return json({
      id: user.sub,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
  });
}
