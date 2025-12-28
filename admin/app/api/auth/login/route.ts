import { supabaseAdmin } from "@/lib/supabaseAdmin";
import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("Login API route hit.");
    const body = await req.json();
    const { whatsapp_number, password } = body;
    console.log("Received login request for whatsapp_number:", whatsapp_number);

    if (!whatsapp_number || !password) {
      console.error("Missing whatsapp_number or password in request body.");
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    console.log("Querying database for user...");
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, fullname, password_hash, role, whatsapp_number, country, gender")
      .eq("whatsapp_number", whatsapp_number)
      .limit(1)
      .single();

    console.log("Supabase query result:", { data, error });

    if (error || !data) {
      console.error("User not found or Supabase error:", error);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const match = await bcrypt.compare(password, data.password_hash);
    if (!match) {
      console.warn("Password does not match for user with whatsapp_number:", whatsapp_number);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const tokenPayload = {
      userId: data.id,
      fullname: data.fullname,
      role: data.role || "user",
      whatsapp_number: data.whatsapp_number,
      country: data.country,
      gender: data.gender,
    };

    console.log("Password matched. Creating token with payload:", tokenPayload);
    const token = signToken(tokenPayload);

    // set cookie
    const maxAge = 7 * 24 * 60 * 60;
    const response = NextResponse.json({
      // Return the same payload in the response body for immediate use by the client
      user: tokenPayload,
    });
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/", // General path to be included in all requests
      maxAge,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    console.log("Successfully set cookie. Sending response.");
    return response;
  } catch (err) {
    console.error("An unexpected error occurred in the login route:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
