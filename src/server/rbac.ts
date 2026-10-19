import type { Role } from "@prisma/client";
import { AuthError } from "@/server/auth/errors";
import { hasRole } from "@/lib/rbac";

export {
  ROLE_LABELS,
  PERMISSIONS,
  hasRole,
  canAccessPath,
  homePathForRole,
  navItemsForRole,
} from "@/lib/rbac";

export function assertRole(user: { role: Role }, roles: readonly Role[]): void {
  if (!hasRole(user, roles)) {
    throw new AuthError("Accès refusé", 403);
  }
}
