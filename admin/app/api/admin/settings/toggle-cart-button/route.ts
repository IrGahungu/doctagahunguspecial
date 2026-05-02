// app/api/admin/settings/toggle-cart-button/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { isVisible } = body;

    if (typeof isVisible !== 'boolean') {
      return NextResponse.json({ error: "isVisible must be a boolean" }, { status: 400 });
    }

    console.log(`[ADMIN API] Toggling Cart Button visibility. New state requested: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);

    const valueToStore = String(isVisible);

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert({ key: 'show_add_to_cart_button', value: valueToStore }, { onConflict: 'key' });

    if (error) throw error;

    console.log(`[ADMIN API] Successfully saved Cart Button visibility as string: "${valueToStore}"`);

    return NextResponse.json({
      success: true,
      message: `Cart button visibility updated to ${isVisible}`,
      show_add_to_cart_button: isVisible
    });

  } catch (error: any) {
    console.error("Toggle cart button error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}