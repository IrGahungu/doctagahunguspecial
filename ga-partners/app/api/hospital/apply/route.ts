
// ga-partners/app/api/hospital/apply/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const formData: any = await req.formData();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const whatsapp_number = formData.get("whatsapp_number") as string;
    const locations = formData.get("locations") as string;
    const password = formData.get("password") as string;
    const payment_id = formData.get("payment_id") as string;
    const country = formData.get("country") as string;
    const origin_country = formData.get("origin_country") as string;
    
    const imageFile = formData.get("image");
    let imagePath = null;

    if (imageFile && imageFile instanceof File) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("hospital-images")
        .upload(fileName, imageFile, {
          contentType: imageFile.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;
      imagePath = fileName;
    } else if (typeof imageFile === "string") {
      imagePath = imageFile;
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Password strength check: 8+ chars, 1 capital, 1 special, 3+ numbers
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=(?:.*\d){3,}).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({
        error: "Password must be at least 8 characters, include 1 capital letter, 1 special character, and at least 3 numbers"
      }, { status: 400 });
    }

    // We generate a simple uuid for user id.
    const userId = uuidv4();

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from("hospital_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Please login." }, { status: 409 });
    }

    const { error: insertUserErr } = await supabaseAdmin
      .from("hospital_users")
      .insert([
        { id: userId, email, password_hash: password }
      ]);

    if (insertUserErr) {
      console.error("user insert err", insertUserErr);
      throw insertUserErr;
    }

    // 2) Insert application record linked to userId
    const { error: insertAppErr } = await supabaseAdmin
      .from("hospital_applications")
      .insert([
        {
          id: userId,
          name,
          email,
          password: password,
          whatsapp_number,
          locations,
          payment_id,
          image: imagePath,
          status: "pending",
          country,
          origin_country,
        }
      ]);

    if (insertAppErr) {
      console.error("application insert err:", insertAppErr);
      // If application insert fails, consider deleting created user to avoid orphaned user
      await supabaseAdmin.from("hospital_users").delete().eq("id", userId);
      throw insertAppErr;
    }

    return NextResponse.json({ ok: true, message: "Application saved" }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}


export async function PUT(req: Request) {
  try {
    const formData: any = await req.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    // Define allowed fields for partial updates
    const allowedFields = [
      "name",
      "email",
      "whatsapp_number",
      "password",
      "image",
      "payment_id",
      "country",
      "origin_country",
      "hospital_plans",
      "coverage_summary",
      "claim_process",
      "partner_hospitals",
      "partner_pharmacies",
      "contact_details",
      "locations",
      "available_services",
      "available_blood_types",
      "medical_equipment",
      "service_summary",
      "admission_process",
      "partner_insurances"
    ];

    const updates: any = {};

    // Only add fields to updates if they exist in formData
    for (const field of allowedFields) {
      if (formData.has(field)) {
        updates[field] = formData.get(field);
      }
    }

    // Handle image separately
    const imageFile = formData.get("image");
    if (imageFile && imageFile instanceof File) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("hospital-images")
        .upload(fileName, imageFile, {
          contentType: imageFile.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;
      updates.image = fileName;
    } else if (typeof imageFile === "string" && imageFile) {
      updates.image = imageFile;
    }

    const { data: currentApp } = await supabaseAdmin
      .from("hospital_applications")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (currentApp?.status === "rejected") {
      updates.status = "pending";
      updates.rejection_reason = null;
    }

    // Handle User Table Updates (Email/Password)
    const userUpdates: any = {};
    if (formData.has("email")) userUpdates.email = formData.get("email");
    if (formData.has("password")) {
      const pwd = formData.get("password") as string;
      if (pwd) {
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=(?:.*\d){3,}).{8,}$/;
        if (!passwordRegex.test(pwd)) {
          return NextResponse.json({
            error: "Password must be at least 8 characters, include 1 capital letter, 1 special character, and at least 3 numbers"
          }, { status: 400 });
        }
        userUpdates.password_hash = pwd;
      }
    }

    if (Object.keys(userUpdates).length > 0) {
      const { error: userErr } = await supabaseAdmin
        .from("hospital_users")
        .update(userUpdates)
        .eq("id", id);
      if (userErr) throw userErr;
    }

    // Only perform application update if there are changes
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin
        .from("hospital_applications")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    }

    return NextResponse.json({ ok: true, message: "Application updated" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hospital_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}




      