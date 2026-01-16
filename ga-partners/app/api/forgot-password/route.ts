import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    let tableName = "";
    switch (role) {
      case "doctor":
        tableName = "doctor_users";
        break;
      case "pharmacy":
        tableName = "pharmacy_users";
        break;
      case "insurance":
        tableName = "insurance_users";
        break;
      case "hospital":
        tableName = "hospital_users";
        break;
      default:
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user exists
    const { data: user, error } = await supabaseAdmin
      .from(tableName)
      .select("id, email")
      .eq("email", email)
      .single();

    if (error || !user) {
      // For security, don't reveal if the email exists or not
      return NextResponse.json({ success: true });
    }

    // 1. Generate a random token
    const token = crypto.randomBytes(32).toString("hex");
    
    // 2. Set expiration (1 hour from now)
    const expires = new Date(Date.now() + 3600 * 1000).toISOString();

    // 3. Save token and expiration to DB
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({ reset_token: token, reset_token_expires: expires })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error saving reset token:", updateError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    
    // 4. Mock Email Sending (Log to console)
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}&role=${role}`;
    
    console.log("=================================================================");
    console.log(`[Mock Email] Password reset requested for ${role} user: ${email}`);
    console.log(`[Mock Email] Reset Link: ${resetLink}`);
    console.log("=================================================================");
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}