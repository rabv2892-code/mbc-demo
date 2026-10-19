import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/server/auth/jwt";
import { sessionCookieOptions } from "@/server/auth/cookie";

function clearCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}

export async function POST() {
  return clearCookie(NextResponse.json({ ok: true }));
}

export async function GET(request: Request) {
  const login = new URL("/login", request.url);
  return clearCookie(NextResponse.redirect(login));
}
