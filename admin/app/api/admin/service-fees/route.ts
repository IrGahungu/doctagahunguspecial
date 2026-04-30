import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("service_fees")
      .select("*")
      .order("country", { ascending: true })
      .order("service_type", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[GET Service Fees Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { service_type, country, fee } = body;

    if (!service_type || !country || fee === undefined) {
      return NextResponse.json({ error: "Service type, country, and fee are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("service_fees")
      .insert([{ service_type: service_type.toLowerCase(), country, fee: Number(fee) }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[POST Service Fees Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const { fee } = await req.json();

    if (!id) {
      console.error("[PUT Service Fees Error]: ID is missing from query parameters.");
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    if (fee === undefined) {
      console.error(`[PUT Service Fees Error]: Fee is missing from request body for ID: ${id}`);
      return NextResponse.json({ error: "Fee is required" }, { status: 400 });
    }

    console.log(`[PUT Service Fees] Attempting to update fee for ID: ${id} with new fee: ${fee}`);

    const { data, error } = await supabaseAdmin
      .from("service_fees")
      .update({ fee: Number(fee) })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`[PUT Service Fees Error]: Supabase update failed for ID: ${id}`, error);
      throw error;
    }
    console.log(`[PUT Service Fees] Successfully updated fee for ID: ${id}`);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[PUT Service Fees Error]: An unexpected error occurred.", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
