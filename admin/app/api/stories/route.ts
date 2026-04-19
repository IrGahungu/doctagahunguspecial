import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase server client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠ must be service role key
);

// -----------------------------
// GET all stories
// -----------------------------
export async function GET() {
  console.log("[API] GET /api/stories");

  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[API] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// -----------------------------
// CREATE story
// -----------------------------
export async function POST(req: Request) {
  console.log("[API] POST /api/stories");

  try {
    const body = await req.json();
    console.log("[API] Incoming body:", body);

    const { data, error } = await supabase
      .from("stories")
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error("[API] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API] POST crash:", err);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// -----------------------------
// UPDATE story
// -----------------------------
export async function PUT(req: Request) {
  console.log("[API] PUT /api/stories");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing story ID" },
      { status: 400 }
    );
  }

  const body = await req.json();
  console.log("[API] Updating story:", id, body);

  const { data, error } = await supabase
    .from("stories")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[API] PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

// -----------------------------
// DELETE story
// -----------------------------
export async function DELETE(req: Request) {
  console.log("[API] DELETE /api/stories");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing story ID" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[API] DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}