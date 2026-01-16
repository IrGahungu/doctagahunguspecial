import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Extract form data
    const {
      name,
      email,
      password,
      specialty,
      bio,
      booking_type,
      country,
      whatsapp_number,
      consultation_fee_online,
      consultation_fee_offline,
      availability,
      location,
      payment_id, // Renamed from 'payment' to match the form state
      image, // This is now a URL string
      agreementImage, // This is now a URL string
      originCountry,
      idImage,
      medicalDegreeImage,
      medicalLicenceImage,
      proofOfPracticeImage,
    } = body;

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from("doctor_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json("An account with this email already exists." , { status: 409 });
    }

    // Create user
    const userId = uuidv4();
    const { error: userInsertError } = await supabaseAdmin
      .from("doctor_users")
      .insert([{  
        id: userId, // Add this line to link the user to themselves
        email, 
        password_hash: password,
        name,
        specialty,
        bio,
        status: "pending",
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
      }]);
    if (userInsertError) throw userInsertError;

    // Create application
    const { error: appInsertError } = await supabaseAdmin
      .from("doctor_applications")
      .insert([{
        id: userId,
        name,
        email,
        password: password,
        specialty,
        bio,
        booking_type,
        country,
        whatsapp_number,
        consultation_fee_online,
        consultation_fee_offline,
        availability,
        location,
        image: image, // Use the URL from the body
        agreement_image: agreementImage, // Use the URL from the body
        status: "pending",
        payment_id, // Use the correct field name
        origin_country: originCountry,
        id_image: idImage,
        medical_degree_image: medicalDegreeImage,
        medical_licence_image: medicalLicenceImage,
        proof_of_practice_image: proofOfPracticeImage,
      }]);

    if (appInsertError) {
      // Cleanup user if application insert fails
      await supabaseAdmin.from("doctor_users").delete().eq("id", userId);
      // Note: We don't clean up images here because they were uploaded in a separate step.
      // You might want to add a cleanup job for orphaned images later.
      throw appInsertError;
    }

    return NextResponse.json({ message: "Application submitted successfully" }, { status: 201 });

  } catch (error: any) {
    console.error("Application submission failed:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
