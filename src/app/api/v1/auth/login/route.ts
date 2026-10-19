import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/server/auth/hash";
import { COOKIE_NAME, signAuthToken } from "@/server/auth/jwt";
import { sessionCookieOptions } from "@/server/auth/cookie";
import { errorResponse, json } from "@/server/api";
import { writeAudit } from "@/server/audit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await db.user.findUnique({
      where: { email: body.email.toLowerCase().trim() },
    });
    if (!user || !user.isActive) {
      return json({ error: "Identifiants invalides" }, 401);
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return json({ error: "Identifiants invalides" }, 401);
    }
    const token = await signAuthToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
    await writeAudit(db, {
      userId: user.id,
      action: "LOGIN",
      module: "auth",
      newValue: { email: user.email },
    });
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
