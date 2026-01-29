import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

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
    const formData: any = await req.formData();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const specialty = formData.get("specialty") as string;
    const bio = formData.get("bio") as string;
    const booking_type = formData.get("booking_type") as string;
    const country = formData.get("country") as string;
    const whatsapp_number = formData.get("whatsapp_number") as string;
    const consultation_fee_online = formData.get("consultation_fee_online") ? Number(formData.get("consultation_fee_online")) : null;
    const consultation_fee_offline = formData.get("consultation_fee_offline") ? Number(formData.get("consultation_fee_offline")) : null;
    
    const availabilityRaw = formData.get("availability") as string;
    const availability = availabilityRaw ? JSON.parse(availabilityRaw) : null;
    
    const locationRaw = formData.get("location") as string;
    const location = locationRaw ? JSON.parse(locationRaw) : [];

    const payment_id = formData.get("payment_id") as string;
    const originCountry = formData.get("originCountry") as string;
    
    const image = formData.get("image") as File | null;

    if (!id) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // Helper to upload file and return path
    const uploadFile = async (file: File | null, folder: string) => {
      if (!file || typeof file === "string") return null;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${folder}/${uuidv4()}-${file.name}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from("doctor-images")
        .upload(fileName, buffer, { contentType: file.type, upsert: true });
        
      if (error) throw error;
      return data.path;
    };

    const imagePath = await uploadFile(image, "profiles");

    const updateData: any = {
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
      origin_country: originCountry,
      status: "pending",
      rejection_reason: null,
      updated_at: new Date(),
    };

    if (imagePath) {
      updateData.image = imagePath;
    }

    // 🔥 RESUBMIT APPLICATION
    const { error } = await supabaseAdmin
      .from("doctor_applications")
      .update(updateData)
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
