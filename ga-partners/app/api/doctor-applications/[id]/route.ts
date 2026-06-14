import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("doctor_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Fetch doctor application failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
 
    // Extract form data
    const name = formData.get("name")?.toString();
    const specialty = formData.get("specialty")?.toString();
    const bio = formData.get("bio")?.toString();
    const booking_type = formData.get("booking_type")?.toString();
    const country = formData.get("country")?.toString();
    const whatsapp_number = formData.get("whatsapp_number")?.toString();
    const consultation_fee_online = formData.get("consultation_fee_online") ? Number(formData.get("consultation_fee_online")?.toString()) : undefined;
    const consultation_fee_offline = formData.get("consultation_fee_offline") ? Number(formData.get("consultation_fee_offline")?.toString()) : undefined;
    const location = formData.get("location")?.toString();
    const originCountry = formData.get("originCountry")?.toString();
    const work_schedule = formData.get("work_schedule")?.toString();

    const availabilityRaw = formData.get("availability")?.toString();
    let availability = undefined;
    if (availabilityRaw && availabilityRaw !== "undefined" && availabilityRaw !== "") {
      try {
        availability = JSON.parse(availabilityRaw);
      } catch (e) {
        console.error("Failed to parse availability JSON:", e);
      }
    }

    // Handle image update
    const imageFile = formData.get("image") as File | null;
    let imagePath = formData.get("existingImage")?.toString();

    if (imageFile && typeof imageFile !== "string" && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const fileName = `profiles/${uuidv4()}-${imageFile.name}`;
      
      const { data, error: uploadError } = await supabaseAdmin.storage
        .from("doctor-images")
        .upload(fileName, buffer, { contentType: imageFile.type, upsert: true });
        
      if (uploadError) throw uploadError;
      imagePath = data.path;
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (bio !== undefined) updateData.bio = bio;
    if (booking_type !== undefined) updateData.booking_type = booking_type;
    if (country !== undefined) updateData.country = country;
    if (whatsapp_number !== undefined) updateData.whatsapp_number = whatsapp_number;
    if (consultation_fee_online !== undefined && !isNaN(consultation_fee_online)) updateData.consultation_fee_online = consultation_fee_online;
    if (consultation_fee_offline !== undefined && !isNaN(consultation_fee_offline)) updateData.consultation_fee_offline = consultation_fee_offline;
    if (location !== undefined) updateData.location = location;
    if (availability !== undefined) updateData.availability = availability;
    if (imagePath !== undefined) updateData.image = imagePath;
    if (originCountry !== undefined) updateData.origin_country = originCountry;
    if (work_schedule !== undefined) updateData.work_schedule = work_schedule;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No data provided for update" }, { status: 400 });
    }

    // Update doctor_users (keeping sync with registration table)
    const { error: userUpdateError } = await supabaseAdmin
      .from("doctor_users")
      .update(updateData)
      .eq("id", id);

    if (userUpdateError) throw userUpdateError;

    // Update doctor_applications (keeping sync with application table)
    const { error: appUpdateError } = await supabaseAdmin
      .from("doctor_applications")
      .update(updateData)
      .eq("id", id);

    if (appUpdateError) throw appUpdateError;

    return NextResponse.json({ message: "Profile updated successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Profile update failed:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}