import { verifyPassword } from "@/server/auth/hash";
import { createPrismaThrottle } from "@/server/auth/login-throttle";
import type { PrismaClient } from "@prisma/client";

const INVALID_LOGIN = "Identifiants invalides";
const TOO_MANY_ATTEMPTS = "Trop de tentatives. Réessayez plus tard.";

/** Hash bcrypt d'une valeur qui n'est le mot de passe d'aucun compte. Égalise le temps de réponse. */
const DUMMY_PASSWORD_HASH = "$2b$12$G1FIAiP29pYDrc5t.9p6ZuDuiEUA1/Ae7sbZRWaB01Z3uO4MI/jpe";

export type LoginUser = {
  id: string;
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "ADMIN_CAFE" | "MOTARD";
  isActive: boolean;
  passwordHash: string;
};

export type LoginThrottlePort = {
  isLocked(email: string, ip: string | null, now: number): Promise<boolean>;
  recordFailure(email: string, ip: string | null, now: number): Promise<void>;
  clearEmail(email: string): Promise<void>;
};

export type LoginResult =
  | { ok: true; user: Omit<LoginUser, "passwordHash" | "isActive"> }
  | { ok: false; status: 401 | 429; message: string };

export async function authenticateLogin(
  deps: {
    findUser(email: string): Promise<LoginUser | null>;
    verifyPassword(password: string, hash: string): Promise<boolean>;
    throttle: LoginThrottlePort;
  },
  input: { email: string; password: string; ip: string | null; now: number },
): Promise<LoginResult> {
  const email = input.email.toLowerCase().trim();
  if (await deps.throttle.isLocked(email, input.ip, input.now)) {
    return { ok: false, status: 429, message: TOO_MANY_ATTEMPTS };
  }

  const user = await deps.findUser(email);
  const passwordOk = await deps.verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.isActive || !passwordOk) {
    await deps.throttle.recordFailure(email, input.ip, input.now);
    return { ok: false, status: 401, message: INVALID_LOGIN };
  }

  await deps.throttle.clearEmail(email);
  return {
    ok: true,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  };
}

export function clientAddress(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null;
  const first = forwardedFor.split(",")[0]?.trim() ?? "";
  if (!first || first.length > 64) return null;
  if (!/^[0-9a-fA-F:.]+$/.test(first)) return null;
  return first;
}

export function prismaLoginDeps(db: PrismaClient) {
  return {
    findUser: (email: string) => db.user.findUnique({ where: { email } }),
    verifyPassword,
    throttle: createPrismaThrottle(db),
  };
}
