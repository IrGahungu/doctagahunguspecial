import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("buses")
      .select(`
        *,
        reservations:bus_reservations(status)
      `)
      .order("departure_date", { ascending: true })
      .order("departure_time", { ascending: true });

    if (error) throw error;

    const busesWithCount = data.map((bus: any) => ({
      ...bus,
      booked_count: bus.reservations?.filter((r: any) => r.status !== 'cancelled').length || 0
    }));

    return NextResponse.json(busesWithCount || []);
  } catch (err: any) {
    console.error("[GET Admin Buses Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data, error } = await supabaseAdmin
      .from("buses")
      .insert([body])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[POST Admin Buses Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("buses")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[PUT Admin Buses Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("buses")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE Admin Buses Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
