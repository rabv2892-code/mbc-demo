import type { Role } from "@prisma/client";
import { AuthError } from "@/server/auth/errors";

export const LAST_SUPER_ADMIN_LOCK = "mbc:last-super-admin";
export const LAST_SUPER_ADMIN_MESSAGE = "Impossible de retirer le dernier Super Admin actif.";

export function lastSuperAdminViolation(input: {
  operation: "update" | "delete";
  existingRole: Role;
  existingActive: boolean;
  nextRole: Role;
  nextActive: boolean;
  otherActiveSuperAdmins: number;
}): boolean {
  const isLastActive = input.existingRole === "SUPER_ADMIN" && input.existingActive && input.otherActiveSuperAdmins < 1;
  if (!isLastActive) return false;
  if (input.operation === "delete") return true;
  return input.nextRole !== "SUPER_ADMIN" || !input.nextActive;
}

export function assertKeepsLastSuperAdmin(input: Parameters<typeof lastSuperAdminViolation>[0]): void {
  if (lastSuperAdminViolation(input)) {
    throw new AuthError(LAST_SUPER_ADMIN_MESSAGE, 409);
  }
}
