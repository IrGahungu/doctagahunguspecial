import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const formData: any = await req.formData();
 
    // Extract form data
    const name = formData.get("name")?.toString() || "";
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";
    const specialty = formData.get("specialty")?.toString() || "";
    const bio = formData.get("bio")?.toString() || "";
    const booking_type = formData.get("booking_type")?.toString() || "";
    const country = formData.get("country")?.toString() || "";
    const whatsapp_number = formData.get("whatsapp_number")?.toString() || "";
    const consultation_fee_online = formData.get("consultation_fee_online") ? Number(formData.get("consultation_fee_online")?.toString()) : null;
    const consultation_fee_offline = formData.get("consultation_fee_offline") ? Number(formData.get("consultation_fee_offline")?.toString()) : null;
    
    const availabilityRaw = formData.get("availability")?.toString();
    const availability = availabilityRaw ? JSON.parse(availabilityRaw) : null;
    
    const location = formData.get("location")?.toString() || "";
    const payment_id = formData.get("payment_id")?.toString() || "";
    const originCountry = formData.get("originCountry")?.toString() || "";

    // Extract images
    const image = formData.get("image") as File | null;

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

    // Helper to upload file and return path
    const uploadFile = async (file: File | null, folder: string) => {
      if (!file || typeof file === "string") return null;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${folder}/${uuidv4()}-${file.name}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from("doctor-images") // Ensure this bucket exists in Supabase
        .upload(fileName, buffer, { contentType: file.type, upsert: true });
        
      if (error) throw error;
      return data.path;
    };

    // Upload images and get paths
    const imagePath = await uploadFile(image, "profiles");

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
        image: imagePath,
        origin_country: originCountry,
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
        image: imagePath,
        status: "pending",
        payment_id, // Use the correct field name
        origin_country: originCountry,
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
