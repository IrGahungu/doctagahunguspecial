import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ----------------------------------
// GET all posts
// ----------------------------------
export async function GET() {
  console.log("[API] GET /api/posts");

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[API] GET posts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ----------------------------------
// CREATE post
// ----------------------------------
export async function POST(req: Request) {
  console.log("[API] POST /api/posts");

  try {
    const body = await req.json();
    console.log("[API] Incoming post body:", body);

    const { data, error } = await supabase
      .from("posts")
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error("[API] POST post error:", error);
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

// ----------------------------------
// UPDATE post
// ----------------------------------
export async function PUT(req: Request) {
  console.log("[API] PUT /api/posts");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
  }

  const body = await req.json();
  console.log("[API] Updating post:", id, body);

  const { data, error } = await supabase
    .from("posts")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[API] PUT post error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

// ----------------------------------
// DELETE post
// ----------------------------------
export async function DELETE(req: Request) {
  console.log("[API] DELETE /api/posts");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[API] DELETE post error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}