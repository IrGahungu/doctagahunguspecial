import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(req: Request) {
  try {
    const { key, isVisible } = await req.json();

    console.log("Updating:", key, isVisible);

    // Map the keys from ButtonSettings to existing DB settings keys
    const keyMap: Record<string, string> = {
      'show_product_cta_button': 'show_call_car_button_product',
      'show_doctor_cta_button': 'show_call_car_button_doctor',
      'show_hospital_cta_button': 'show_call_car_button_hospital',
      'show_insurance_cta_button': 'show_call_car_button_insurance',
      'show_pharmacy_cta_button': 'show_call_car_button_pharmacy'
    };

    const dbKey = keyMap[key] || key;

    const { error } = await supabase
      .from("settings") // ✅ correct table name
      .upsert({
        key: dbKey,
        value: String(isVisible), // because your column is TEXT
      }, { onConflict: 'key' });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Server crash:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}