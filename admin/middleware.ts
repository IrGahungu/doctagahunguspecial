import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "../admin/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get("token");

  console.log(`[Middleware] Path: ${pathname}`);
  console.log(`[Middleware] Token cookie found:`, !!tokenCookie);

  // Allow requests to the login page to proceed without a token
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // If there's no token, redirect to the login page
  if (!tokenCookie) {
    console.log("[Middleware] No token, redirecting to login.");
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Verify the token
  try {
    await verifyToken(tokenCookie.value);
    console.log("[Middleware] Token is valid. Allowing access.");
    return NextResponse.next(); // Token is valid, proceed
  } catch (error) {
    console.error("[Middleware] Token verification failed:", error);
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};