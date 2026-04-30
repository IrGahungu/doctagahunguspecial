import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase admin client with the Service Role Key
// This allows the API to bypass RLS and manage configuration settings
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/settings
 * Fetches the current bus booking EP threshold from the settings table.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "min_ep_required")
      .maybeSingle();

    if (error) throw error;

    // If no value is found in DB, return the default 5000
    const threshold = data ? parseInt(data.value, 10) : 5000;

    return NextResponse.json({ min_ep_required: threshold });
  } catch (error: any) {
    console.error("Fetch settings error:", error.message);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * Updates the bus booking EP threshold in the settings table.
 */
export async function PUT(req: Request) {
  try {
    const { value } = await req.json();

    if (value === undefined || isNaN(parseInt(value, 10)) || parseInt(value, 10) < 0) {
      return NextResponse.json({ error: "Invalid value provided. Must be a non-negative number." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ 
        key: "min_ep_required", 
        value: value.toString(),
        description: "Minimum engagement points required for bus booking eligibility"
      });

    if (error) throw error;

    return NextResponse.json({ success: true, updated_value: value });
  } catch (error: any) {
    console.error("Update settings error:", error.message);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
