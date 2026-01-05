import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET stock items by pharmacy
 * /api/stock?pharmacy_id=UUID
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pharmacy_id = searchParams.get("pharmacy_id");

  if (!pharmacy_id) {
    return NextResponse.json(
      { error: "Pharmacy ID is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("stock")
    .select("*")
    .eq("pharmacy_id", pharmacy_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET stock error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST create new stock item
 */
export async function POST(request: Request) {
  // Debug: Check if cookies are actually reaching the server
  const cookieStore = await cookies();
  const token = cookieStore.get("pharmacyToken")?.value;

  if (!token) {
    console.error("POST stock: Auth failed. No pharmacyToken found.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("POST stock: User authenticated via cookie", token);

  try {
    const body = await request.json();
    console.log("POST stock: Received body", body);

    if (!body.pharmacy_id || !body.name || !body.price || !body.category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("stock")
      .insert([
        {
          pharmacy_id: body.pharmacy_id,
          name: body.name,
          price: Number(body.price),
          original_price: body.original_price
            ? Number(body.original_price)
            : null,
          quantity: Number(body.quantity) || 0,
          description: body.description || null,
          category: body.category,
          image: body.image || null,
          in_stock: body.in_stock ?? true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("POST stock: Database insert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST stock parse error:", err);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

/**
 * DELETE stock item
 * /api/stock?id=UUID
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Item ID is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("stock").delete().eq("id", id);

  if (error) {
    console.error("DELETE stock error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
