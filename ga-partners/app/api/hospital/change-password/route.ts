import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, oldPassword, newPassword } = body;

    console.log("--- Password Change Debug ---");
    console.log("ID:", id);
    console.log("Provided Old Password:", oldPassword);
    console.log("Provided Old Password Length:", oldPassword?.length);

    if (!id || !oldPassword || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch the hospital application to verify the old password
    const { data: app, error: fetchError } = await supabaseAdmin
      .from("hospital_applications")
      .select("password")
      .eq("id", id)
      .single();

    if (fetchError || !app) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    console.log("Stored Password in DB:", app.password);
    const storedPassword = (app.password || "").trim();
    console.log("Stored Password Length (trimmed):", storedPassword.length);

    // Verify old password
    // Comparing as plain text as requested
    const passwordsMatch = storedPassword === oldPassword;
    console.log("Match Result:", passwordsMatch);

    if (!passwordsMatch) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    // 1. Update to new password in hospital_applications
    const { error: updateError } = await supabaseAdmin
      .from("hospital_applications")
      .update({ password: newPassword })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    // 2. Update to new password in hospital_users (Required for Login)
    const { error: userUpdateError } = await supabaseAdmin
      .from("hospital_users")
      .update({ password_hash: newPassword })
      .eq("id", id);

    if (userUpdateError) {
      console.error("Failed to update password in hospital_users:", userUpdateError);
      return NextResponse.json({ error: "Failed to update login password" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Password update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}