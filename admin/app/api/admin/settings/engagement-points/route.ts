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
    const keys = [
      'ep_story_view', 
      'ep_post_view', 
      'ep_post_like', 
      'min_ep_required', 
      'story_duration',
      'show_add_to_cart_button',
      'show_call_car_button_product',
      'show_call_car_button_doctor',
      'show_call_car_button_hospital',
      'show_call_car_button_insurance',
      'show_call_car_button_pharmacy',
      'show_book_online_button',
      'show_book_in_office_button',
      'show_orders_button',
      'show_my_appointments_button',
      'show_book_bus_button',
      'show_my_bus_tickets_button',
      'monetization_goal'
    ];
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", keys);

    if (error) throw error;

    // Map results to an object
    const settings: Record<string, string> = {};
    data?.forEach(row => { settings[row.key] = row.value; });

    const getInt = (key: string, def: number) => settings[key] ? parseInt(settings[key], 10) : def;
    const getBool = (key: string, def: boolean) => settings[key] !== undefined ? settings[key] === 'true' : def;

    return NextResponse.json({
      ep_story_view: getInt('ep_story_view', 500),
      ep_post_view: getInt('ep_post_view', 300),
      ep_post_like: getInt('ep_post_like', 200),
      min_ep_required: getInt('min_ep_required', 5000),
      story_duration: getInt('story_duration', 45000),
      show_add_to_cart_button: getBool('show_add_to_cart_button', true),
      show_call_car_button_product: getBool('show_call_car_button_product', true),
      show_call_car_button_doctor: getBool('show_call_car_button_doctor', true),
      show_call_car_button_hospital: getBool('show_call_car_button_hospital', true),
      show_call_car_button_insurance: getBool('show_call_car_button_insurance', true),
      show_call_car_button_pharmacy: getBool('show_call_car_button_pharmacy', true),
      show_orders_button: getBool('show_orders_button', true), // New
      show_my_appointments_button: getBool('show_my_appointments_button', true), // New
      show_book_bus_button: getBool('show_book_bus_button', true), // New
      show_my_bus_tickets_button: getBool('show_my_bus_tickets_button', true), // New
      monetization_goal: getInt('monetization_goal', 50000),
      show_book_online_button: getBool('show_book_online_button', true),
      show_book_in_office_button: getBool('show_book_in_office_button', true),
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
