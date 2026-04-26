import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase admin client with the Service Role Key
// This allows the admin API to bypass RLS and manage all bookings
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "doctor") {
      const { data, error } = await supabaseAdmin
        .from("bookings")
        .select(`
          *,
          users (
            fullname,
            whatsapp_number
          )
        `)
        .not("doctor_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data || []);
    } 
    
    if (type === "bus") {
      const { data, error } = await supabaseAdmin
        .from("bus_reservations")
        .select(`
          *,
          users (
            fullname,
            whatsapp_number
          ),
          buses (
            company,
            origin,
            destination,
            departure_time,
            price
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json(data || []);
    }

    return NextResponse.json({ error: "Invalid booking type" }, { status: 400 });
  } catch (err: any) {
    console.error("[GET Admin Bookings Error]:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ids, status, type } = body;

    if ((!id && (!ids || ids.length === 0)) || !status) {
      return NextResponse.json({ error: "ID(s) and status are required" }, { status: 400 });
    }

    const tableName = type === "bus" ? "bus_reservations" : "bookings";
    
    let query = supabaseAdmin
      .from(tableName)
      .update({ status });

    if (ids && Array.isArray(ids)) {
      query = query.in("id", ids);
    } else {
      query = query.eq("id", id);
    }

    const { data, error } = await query.select();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[PATCH Admin Bookings Error]:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
