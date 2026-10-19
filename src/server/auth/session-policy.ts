import type { Role } from "@prisma/client";
import type { AuthToken } from "@/server/auth/jwt";

export type SessionUser = AuthToken & { isActive: boolean };

export type DbAuthUser = {
  isActive: boolean;
  role: Role;
  email: string;
  fullName: string;
};

export function applyDbUserToToken(payload: AuthToken, user: DbAuthUser | null): SessionUser | null {
  if (!user || !user.isActive) return null;
  return {
    ...payload,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    isActive: user.isActive,
  };
}
