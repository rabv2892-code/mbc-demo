import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";
import { requireJwtSecret } from "@/lib/env";

export const COOKIE_NAME = process.env.COOKIE_NAME || "mbc_token";
export const JWT_TTL = "12h";
export const JWT_TTL_SECONDS = 60 * 60 * 12;

export type AuthToken = {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
};

function secret() {
  return new TextEncoder().encode(requireJwtSecret());
}

export async function signAuthToken(payload: AuthToken): Promise<string> {
  return new SignJWT({
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_TTL)
    .sign(secret());
}

export async function verifyAuthToken(token: string): Promise<AuthToken> {
  const { payload } = await jwtVerify(token, secret());
  return fromPayload(payload);
}

function fromPayload(payload: JWTPayload): AuthToken {
  if (!payload.sub || typeof payload.email !== "string" || typeof payload.role !== "string") {
    throw new Error("Jeton invalide");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    fullName: typeof payload.fullName === "string" ? payload.fullName : "",
    role: payload.role as Role,
  };
}
