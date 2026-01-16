// ga-partners/app/api/insurance/login/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    console.log("Processing Insurance Login...");
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

    console.log("Looking up user:", email);
    const { data: user, error } = await supabaseAdmin
      .from("insurance_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
    if (!user) {
      console.log("User not found");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = password === user.password_hash;
    if (!ok) {
      console.log("Password mismatch");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    console.log("Credentials valid. Setting cookie for user:", user.id);
    // Set a simple cookie with user id (for demo). In production use secure, signed sessions.
    const cookieStore = await cookies();
    cookieStore.set({
      name: "insuranceToken",
      value: user.id,
      httpOnly: true,
      path: "/",
      // secure: true, // enable on production with https
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Login API Error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
