import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
// import { verifyToken } from "@/lib/auth" // No longer needed here

// Define protected routes
const protectedRoutes = ["/feed", "/profile", "/most-liked"]
const authRoutes = ["/auth/login", "/auth/register"]


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookies or Authorization header (only presence check)
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("auth-token")?.value;
  const hasToken = (authHeader && authHeader.startsWith("Bearer ")) || !!cookieToken;

  console.log("[MIDDLEWARE DEBUG] Has Token (presence check):", hasToken);

  // Redirect authenticated users away from auth pages
  if (hasToken && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  // Redirect unauthenticated users to login
  // If a protected route is accessed WITHOUT a token, redirect to login
  if (!hasToken && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
