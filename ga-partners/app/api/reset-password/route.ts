import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { token, role, password } = await request.json();

    if (!token || !role || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Find user with matching token and check expiration
    const { data: user, error } = await supabaseAdmin
      .from(tableName)
      .select("id, reset_token_expires")
      .eq("reset_token", token)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const expires = new Date(user.reset_token_expires);
    if (expires < new Date()) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Update user: set new password hash, clear reset token fields
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({
        password_hash: hash,
        reset_token: null,
        reset_token_expires: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
