// ga-partners/app/api/doctor/apply/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      whatsapp_number,
      specialty,
      location,
      bio,
      password,
      payment,
      image,
      agreementImage,
      payment_id,
      consultation_fee_online,
      consultation_fee_offline,
      booking_type,
      availability,
      country,
      originCountry,
      idImage,
      medicalDegreeImage,
      medicalLicenceImage,
      proofOfPracticeImage,
    } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // 1) Create user in doctor_users table (if email exists, return 409)
    // We generate a simple uuid for user id.
    const userId = uuidv4();
    // Hash password
    const hash = password;

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from("doctor_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json("An account with this email already exists. Please login." , { status: 409 });
    }

    const { error: insertUserErr } = await supabaseAdmin
      .from("doctor_users")
      .insert([
        { id: userId, email, password_hash: hash }
      ]);

    if (insertUserErr) {
      console.error("user insert err", insertUserErr);
      throw insertUserErr;
    }

    // 2) Insert application record linked to userId
    const { error: insertAppErr } = await supabaseAdmin
      .from("doctor_applications")
      .insert([
        {
          id: userId,
          name,
          email,
          password: hash,
          whatsapp_number,
          specialty,
          location,
          bio,
          image: image || null,
          agreement_image: agreementImage || null,
          status: "pending",
          payment: payment || payment_id || null,
          consultation_fee_online,
          consultation_fee_offline,
          booking_type,
          availability: availability || null,
          country,
          origin_country: originCountry,
          id_image: idImage,
          medical_degree_image: medicalDegreeImage,
          medical_licence_image: medicalLicenceImage,
          proof_of_practice_image: proofOfPracticeImage,
        }
      ]);

    if (insertAppErr) {
      console.error("application insert err:", insertAppErr);
      // If application insert fails, consider deleting created user to avoid orphaned user
      await supabaseAdmin.from("doctor_users").delete().eq("id", userId);
      throw insertAppErr;
    }

    return NextResponse.json({ ok: true, message: "Application saved" }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
