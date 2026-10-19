import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE_NAME, verifyAuthToken } from "@/server/auth/jwt";
import { AuthError } from "@/server/auth/errors";
import { applyDbUserToToken, type SessionUser } from "@/server/auth/session-policy";

export { AuthError, applyDbUserToToken };
export type { SessionUser };

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = await verifyAuthToken(token);
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, role: true, email: true, fullName: true },
    });
    return applyDbUserToToken(payload, user);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Non authentifié", 401);
  }
  return session;
}
