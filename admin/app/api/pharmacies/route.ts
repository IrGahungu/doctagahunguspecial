import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only key
);

// ---------------- GET ----------------
export async function GET() {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ---------------- POST ----------------
export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("API POST received body:", body);

  const { name, image, locations, accepted_insurances } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("pharmacies").insert([
    {
      name,
      image,
      locations,
      accepted_insurances,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ---------------- PUT ----------------
export async function PUT(req: NextRequest) {
  const body = await req.json();
  console.log("API PUT received body:", body);

  const { id, name, image, locations, accepted_insurances } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pharmacies")
    .update({ name, image, locations, accepted_insurances })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ---------------- DELETE ----------------
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("pharmacies").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
