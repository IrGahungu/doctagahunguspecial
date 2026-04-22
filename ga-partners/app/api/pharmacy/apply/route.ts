// ga-partners/app/api/pharmacy/apply/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const formData: any = await req.formData();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const whatsapp_number = formData.get("whatsapp_number") as string;
    const location = formData.get("location") as string;
    const password = formData.get("password") as string;
    const payment_id = formData.get("payment_id") as string;
    const country = formData.get("country") as string;
    const origin_country = formData.get("origin_country") as string;
    
    const image = formData.get("image") as File | null;

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

    // 1) Create user in doctor_users table (if email exists, return 409)
    // We generate a simple uuid for user id.
    const userId = uuidv4();

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from("pharmacy_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Please login." }, { status: 409 });
    }

    const { error: insertUserErr } = await supabaseAdmin
      .from("pharmacy_users")
      .insert([
        { id: userId, email, password_hash: password }
      ]);

    if (insertUserErr) {
      console.error("user insert err", insertUserErr);
      throw insertUserErr;
    }

    // Generate MGJK sequence
    // We use a database RPC call to get a unique sequence number atomically.
    // This prevents race conditions where multiple users apply at the same time.
    const { data: sequenceNumber, error: seqError } = await supabaseAdmin.rpc("get_next_pharmacy_seq");

    if (seqError) {
      throw new Error(`Failed to generate sequence number: ${seqError.message}`);
    }

    const nameWithSequence = `${name} DMJKG${String(sequenceNumber).padStart(4, "0")}`;

    // Helper to upload file and return path
    const uploadFile = async (file: File | null, folder: string) => {
      if (!file || typeof file === "string") return null;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${folder}/${uuidv4()}-${file.name}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from("pharmacy-images")
        .upload(fileName, buffer, { contentType: file.type, upsert: true });
        
      if (error) throw error;
      return data.path;
    };

    const imagePath = await uploadFile(image, "profiles");

    // 2) Insert application record linked to userId
    const { error: insertAppErr } = await supabaseAdmin
      .from("pharmacy_applications")
      .insert([
        {
          id: userId,
          name: nameWithSequence,
          email,
          password: password,
          whatsapp_number,
          location,
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
      await supabaseAdmin.from("pharmacy_users").delete().eq("id", userId);
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
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const whatsapp_number = formData.get("whatsapp_number") as string;
    const password = formData.get("password") as string;
    const payment_id = formData.get("payment_id") as string;
    const country = formData.get("country") as string;
    const location = formData.get("location") as string;
    const origin_country = formData.get("origin_country") as string;
    const opening_hours = formData.get("opening_hours") as string;
    const contact_email = formData.get("contact_email") as string;
    const contact_phone = formData.get("contact_phone") as string;
    const contact_office = formData.get("contact_office") as string;
    const contact_website = formData.get("contact_website") as string;
    const accepted_insurances = formData.get("accepted_insurances") as string;
    const status = formData.get("status") as string;

    const image = formData.get("image") as File | null;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const updates: any = {
      name,
      email,
      whatsapp_number,
      payment_id,
      location,
      country,
      origin_country,
      opening_hours,
      contact_email,
      contact_phone,
      contact_office,
      contact_website,
      accepted_insurances,
    };

    if (status) updates.status = status;

    // Helper to upload file and return path
    const uploadFile = async (file: File | null, folder: string) => {
      if (!file || typeof file === "string") return null;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${folder}/${uuidv4()}-${file.name}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from("pharmacy-images")
        .upload(fileName, buffer, { contentType: file.type, upsert: true });
        
      if (error) throw error;
      return data.path;
    };

    const imagePath = await uploadFile(image, "profiles");
    if (imagePath) {
      updates.image = imagePath;
    }

    if (password) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=(?:.*\d){3,}).{8,}$/;
      if (!passwordRegex.test(password)) {
        return NextResponse.json({
          error: "Password must be at least 8 characters, include 1 capital letter, 1 special character, and at least 3 numbers"
        }, { status: 400 });
      }

      await supabaseAdmin
        .from("pharmacy_users")
        .update({ email, password_hash: password })
        .eq("id", id);

      updates.password = password;
    } else {
      await supabaseAdmin
        .from("pharmacy_users")
        .update({ email })
        .eq("id", id);
    }

    const { error } = await supabaseAdmin
      .from("pharmacy_applications")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Profile updated successfully" });
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
    .from("pharmacy_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
