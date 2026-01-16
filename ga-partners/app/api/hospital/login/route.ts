// ga-partners/app/api/doctor/login/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

    const { data: user, error } = await supabaseAdmin
      .from("hospital_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = password === user.password_hash;
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Set a simple cookie with user id (for demo). In production use secure, signed sessions.
    const cookieStore = await cookies();
    cookieStore.set({
      name: "hospitalToken",
      value: user.id,
      httpOnly: true,
      path: "/",
      // secure: true, // enable on production with https
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
