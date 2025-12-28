import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const tokenCookie = request.cookies.get("token");

    if (!tokenCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // The verifyToken function will throw an error if the token is invalid
    const payload = await verifyToken(tokenCookie.value);

    // Return the user payload from the token
    return NextResponse.json({ user: payload });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    // If token is invalid or expired, verifyToken will throw
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}