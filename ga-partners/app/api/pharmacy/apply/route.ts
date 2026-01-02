// ga-partners/app/api/pharmacy/apply/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      whatsapp_number,
      location,
      password,
      image,
      agreementImage,
      payment_id,
      country,
      originCountry,
    } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // 1) Create user in doctor_users table (if email exists, return 409)
    // We generate a simple uuid for user id.
    const userId = uuidv4();
    // Hash password
    const hash = await bcrypt.hash(password, 10);

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
        { id: userId, email, password_hash: hash }
      ]);

    if (insertUserErr) {
      console.error("user insert err", insertUserErr);
      throw insertUserErr;
    }

    // 2) Insert application record linked to userId
    const { error: insertAppErr } = await supabaseAdmin
      .from("pharmacy_applications")
      .insert([
        {
          id: userId,
          name,
          email,
          password: hash,
          whatsapp_number,
          location,
          payment_id,
          image: image || null,
          agreement_image: agreementImage || null,
          status: "pending",
          country,
          origin_country: originCountry,
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
    const body = await req.json();
    const {
      id,
      name,
      email,
      whatsapp_number,
      password,
      image,
      agreementImage,
      payment_id,
      country,
      originCountry,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const updates: any = {
      name,
      email,
      whatsapp_number,
      payment_id,
      image,
      agreement_image: agreementImage,
      country,
      origin_country: originCountry,
      status: "pending",
      rejection_reason: null,
    };

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.password = hash;

      const { error: userErr } = await supabaseAdmin
        .from("pharmacy_users")
        .update({ email, password_hash: hash })
        .eq("id", id);
      if (userErr) throw userErr;
    } else {
      const { error: userErr } = await supabaseAdmin
        .from("pharmacy_users")
        .update({ email })
        .eq("id", id);
      if (userErr) throw userErr;
    }

    const { error } = await supabaseAdmin
      .from("pharmacy_applications")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

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
    .from("pharmacy_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
