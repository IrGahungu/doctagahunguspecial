// ga-partners/app/api/doctor/login/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  console.log("POST /api/doctor/login hit");
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Error parsing JSON body:", e);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, password } = body;
    console.log("--- Login Debug ---");
    console.log("Email:", email);

    if (!email || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

    const { data: user, error } = await supabaseAdmin
      .from("doctor_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      console.log("User not found");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const storedPassword = (user.password_hash || "").trim();
    const inputPassword = (password || "").trim();
    console.log("Stored Password Length:", storedPassword.length);
    console.log("Input Password Length:", inputPassword.length);
    console.log("Stored Password Value:", storedPassword);
    console.log("Input Password Value:", inputPassword);

    if (storedPassword.startsWith("$2")) {
      console.log("WARNING: Stored password appears to be hashed, but login is performing plain text comparison.");
    }

    const ok = inputPassword === storedPassword;
    console.log("Match:", ok);

    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Set a simple cookie with user id (for demo). In production use secure, signed sessions.
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: "doctorToken",
      value: user.id,
      httpOnly: true,
      path: "/",
      // secure: true, // enable on production with https
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
