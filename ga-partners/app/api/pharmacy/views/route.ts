import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pharmacy_id = searchParams.get("pharmacy_id");

  if (!pharmacy_id) {
    return NextResponse.json({ error: "Pharmacy ID is required" }, { status: 400 });
  }

  try {
    // Calculate date 7 days ago
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const startDate = date.toISOString();

    const { data, error } = await supabaseAdmin
      .from("pharmacy_view_logs")
      .select("created_at")
      .eq("pharmacy_id", pharmacy_id)
      .gte("created_at", startDate);

    if (error) {
      // If table doesn't exist (e.g. not run SQL yet), return empty object gracefully
      if (error.code === '42P01') return NextResponse.json({});
      throw error;
    }

    // Aggregate views by date
    const viewsByDate: Record<string, number> = {};
    
    data?.forEach((log: any) => {
      const day = new Date(log.created_at).toISOString().split('T')[0];
      viewsByDate[day] = (viewsByDate[day] || 0) + 1;
    });

    return NextResponse.json(viewsByDate);
  } catch (error: any) {
    console.error("Error fetching pharmacy views:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}