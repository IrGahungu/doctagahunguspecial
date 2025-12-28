import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
  return response;
}
