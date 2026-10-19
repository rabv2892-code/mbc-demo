import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { canAccessPath, homePathForRole, type Role } from "@/lib/rbac";
import { requireJwtSecret } from "@/lib/env";

const COOKIE_NAME = process.env.COOKIE_NAME || "mbc_token";
const PUBLIC_PATHS = ["/login"];
const PATH_HEADER = "x-mbc-pathname";

function secret() {
  return new TextEncoder().encode(requireJwtSecret());
}

function withPathHeader(request: NextRequest, pathname: string) {
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, pathname);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!token) {
    if (isPublic || pathname === "/") {
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role as Role;
    if (pathname === "/") {
      return NextResponse.redirect(new URL(homePathForRole(role), request.url));
    }
    if (!isPublic && !canAccessPath(role, pathname)) {
      return NextResponse.redirect(new URL(homePathForRole(role), request.url));
    }
    return withPathHeader(request, pathname);
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
