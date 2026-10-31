import type { Role } from "@/lib/rbac";
import { canAccessPath, homePathForRole } from "@/lib/rbac";

export function guardAppPage(
  session: { role: Role } | null,
  pathname: string,
): "allow" | "login" | { redirect: string } {
  if (!session) return "login";
  const home = homePathForRole(session.role);
  if (!pathname) return { redirect: home };
  if (pathname === home || canAccessPath(session.role, pathname)) return "allow";
  return { redirect: home };
}
