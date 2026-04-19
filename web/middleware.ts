import { NextRequest, NextResponse } from "next/server";

/**
 * Edge-compatible middleware — reads the JWT session cookie directly.
 * Avoids importing auth.ts which pulls in bcryptjs (not edge-safe).
 *
 * next-auth v5 cookie names:
 *   production (HTTPS): __Secure-authjs.session-token
 *   development (HTTP): authjs.session-token
 */
function getSessionToken(req: NextRequest): string | undefined {
  return (
    req.cookies.get("__Secure-authjs.session-token")?.value ??
    req.cookies.get("authjs.session-token")?.value
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always pass through: static assets, API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isLoggedIn = !!getSessionToken(req);

  // Unauthenticated → redirect to /login
  if (!isLoggedIn && !isAuthPage) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  // Already logged in → skip auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
