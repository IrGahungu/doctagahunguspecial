import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { partnerTranslations, Language } from "@/app/translations";

export async function PUT(req: Request) {
  const lang = (req.headers.get("x-language") as Language) || "en";
  const t = partnerTranslations[lang] || partnerTranslations.en;

  try {
    const body = await req.json();
    const { id, oldPassword, newPassword } = body;

    console.log("--- Password Change Debug ---");
    console.log("ID:", id);
    console.log("Provided Old Password:", oldPassword);
    console.log("Provided Old Password Length:", oldPassword?.length);

    if (!id || !oldPassword || !newPassword) {
      return NextResponse.json({ error: t.fillAllFields }, { status: 400 });
    }

    // Fetch the doctor application to verify the old password
    const { data: app, error: fetchError } = await supabaseAdmin
      .from("doctor_applications")
      .select("password")
      .eq("id", id)
      .single();

    if (fetchError || !app) {
      return NextResponse.json({ error: t.errorLoadingDoctor }, { status: 404 });
    }

    console.log("Stored Password in DB:", app.password);
    const storedPassword = (app.password || "").trim();
    console.log("Stored Password Length (trimmed):", storedPassword.length);

    // Verify old password
    // Comparing as plain text as requested
    const passwordsMatch = storedPassword === oldPassword;
    console.log("Match Result:", passwordsMatch);

    if (!passwordsMatch) {
      return NextResponse.json({ error: t.incorrectCurrentPassword }, { status: 400 });
    }

    // 1. Update to new password in doctor_applications
    const { error: updateError } = await supabaseAdmin
      .from("doctor_applications")
      .update({ password: newPassword })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: t.updatePasswordFail }, { status: 500 });
    }

    // 2. Update to new password in doctor_users (Required for Login)
    const { error: userUpdateError } = await supabaseAdmin
      .from("doctor_users")
      .update({ password_hash: newPassword })
      .eq("id", id);

    if (userUpdateError) {
      console.error("Failed to update password in doctor_users:", userUpdateError);
      return NextResponse.json({ error: t.updateLoginPasswordFail }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Password update error:", error);
    return NextResponse.json({ error: t.serverError }, { status: 500 });
  }
}