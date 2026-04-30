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
 * Fetches all engagement point related settings.
 */
export async function GET() {
  try {
    const keys = ['ep_story_view', 'ep_post_view', 'ep_post_like', 'min_ep_required', 'story_duration'];
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", keys);

    if (error) throw error;

    // Map results to an object
    const settings: Record<string, number> = {};
    data?.forEach(row => {
      settings[row.key] = parseInt(row.value, 10);
    });

    return NextResponse.json({
      ep_story_view: settings.ep_story_view ?? 500,
      ep_post_view: settings.ep_post_view ?? 300,
      ep_post_like: settings.ep_post_like ?? 200,
      min_ep_required: settings.min_ep_required ?? 5000,
      story_duration: settings.story_duration ?? 45000 // Add story_duration
    });
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
    const { value, key, country } = await req.json();

    if (value === undefined || !key) {
      return NextResponse.json({ error: "Invalid value provided. Must be a non-negative number." }, { status: 400 });
    }

    const finalKey = country ? `${key}:${country}` : key;

    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ 
        key: finalKey, 
        value: value.toString(),
        description: `Configurable setting for ${finalKey}`
      });

    if (error) throw error;

    return NextResponse.json({ success: true, updated_value: value });
  } catch (error: any) {
    console.error("Update settings error:", error.message);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
