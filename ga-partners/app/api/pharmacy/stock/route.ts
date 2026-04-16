import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pharmacy_id = searchParams.get("pharmacy_id");

  if (!pharmacy_id) {
    return NextResponse.json({ error: "Pharmacy ID is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
  .from("stock")
  .select(`
    *,
    categories ( name )
  `)
  .eq("pharmacy_id", pharmacy_id)
  .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const formData: any = await req.formData();
    
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const original_price = parseFloat(formData.get("original_price") as string);
    const quantity = parseInt(formData.get("quantity") as string);
    const description = formData.get("description") as string;
    const category_id = formData.get("category_id") as string;
    const pharmacy_id = formData.get("pharmacy_id") as string;
    const in_stock = formData.get("in_stock") === "true";
    const insurancesRaw = formData.get("insurances") as string;
    const insurances = insurancesRaw ? JSON.parse(insurancesRaw) : [];
    
    const image = formData.get("image") as File | null;

    // Upload image if exists
    let imagePath = null;
    if (image && typeof image !== "string") {
      const buffer = Buffer.from(await image.arrayBuffer());
      const fileName = `stock/${uuidv4()}-${image.name}`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("medicine-images")
        .upload(fileName, buffer, { contentType: image.type, upsert: true });
      
      if (uploadError) throw uploadError;
      imagePath = uploadData.path;
    }

    const { data, error } = await supabaseAdmin
      .from("stock")
      .insert([{
        name,
        price,
        original_price,
        quantity,
        description,
        category_id,
        pharmacy_id,
        in_stock,
        insurances,
        image: imagePath
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error creating stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const formData: any = await req.formData();
    
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const original_price = parseFloat(formData.get("original_price") as string);
    const quantity = parseInt(formData.get("quantity") as string);
    const description = formData.get("description") as string;
    const category_id = formData.get("category_id") as string;
    const in_stock = formData.get("in_stock") === "true";
    const insurancesRaw = formData.get("insurances") as string;
    const insurances = insurancesRaw ? JSON.parse(insurancesRaw) : [];
    
    const image = formData.get("image") as File | null;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updates: any = {
      name,
      price,
      original_price,
      quantity,
      description,
      category_id,
      in_stock,
      insurances
    };

    // Upload image if exists
    if (image && typeof image !== "string") {
      const buffer = Buffer.from(await image.arrayBuffer());
      const fileName = `stock/${uuidv4()}-${image.name}`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("medicine-images")
        .upload(fileName, buffer, { contentType: image.type, upsert: true });
      
      if (uploadError) throw uploadError;
      updates.image = uploadData.path;
    }

    const { data, error } = await supabaseAdmin
      .from("stock")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error updating stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("stock")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}