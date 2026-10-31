import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { COOKIE_NAME, signAuthToken } from "@/server/auth/jwt";
import { sessionCookieOptions } from "@/server/auth/cookie";
import { errorResponse, json } from "@/server/api";
import { writeAudit } from "@/server/audit";
import { authenticateLogin, clientAddress, prismaLoginDeps } from "@/server/auth/login-flow";
import { isMissingThrottleTable } from "@/server/auth/login-throttle";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await authenticateLogin(prismaLoginDeps(db), {
      email: body.email,
      password: body.password,
      ip: clientAddress(request.headers.get("x-forwarded-for")),
      now: Date.now(),
    });
    if (!result.ok) {
      return json({ error: result.message }, result.status);
    }
    const token = await signAuthToken({
      sub: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
    });
    await writeAudit(db, {
      userId: result.user.id,
      action: "LOGIN",
      module: "auth",
      newValue: { email: result.user.email },
    });
    const res = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
    });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch (error) {
    if (isMissingThrottleTable(error)) {
      return json({ error: "Connexion temporairement indisponible." }, 503);
    }
    return errorResponse(error);
  }
}
