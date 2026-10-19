import { JWT_TTL_SECONDS } from "@/server/auth/jwt";

export function sessionCookieOptions(maxAge = JWT_TTL_SECONDS) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
