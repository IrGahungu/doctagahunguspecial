import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const cookieStore = await cookies();
  const appId = cookieStore.get("doctorToken")?.value;

  if (!appId) {
    return NextResponse.json({ error: "No application token" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("doctor_applications")
    .select("*")
    .eq("id", appId)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      specialty,
      bio,
      booking_type,
      country,
      whatsapp_number,
      consultation_fee_online,
      consultation_fee_offline,
      availability,
      location,
      payment_id,
      image,
      agreementImage,
      originCountry,
      idImage,
      medicalDegreeImage,
      medicalLicenceImage,
      proofOfPracticeImage,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // 🔥 RESUBMIT APPLICATION
    const { error } = await supabaseAdmin
      .from("doctor_applications")
      .update({
        name,
        specialty,
        bio,
        booking_type,
        country,
        whatsapp_number,
        consultation_fee_online,
        consultation_fee_offline,
        availability,
        location,
        payment_id,
        image,
        agreement_image: agreementImage,
        origin_country: originCountry,
        id_image: idImage,
        medical_degree_image: medicalDegreeImage,
        medical_licence_image: medicalLicenceImage,
        proof_of_practice_image: proofOfPracticeImage,

        // ✅ REQUIRED FOR RESUBMISSION
        status: "pending",
        rejection_reason: null,
        updated_at: new Date(),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: "Application resubmitted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Resubmission failed:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
