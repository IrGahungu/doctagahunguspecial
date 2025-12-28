import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        created_at,
        users (fullname),
        order_items (
          id,
          quantity,
          price,
          medicines (name)
        )
      `);

    if (error) {
      console.error('❌ Supabase fetch error:', error);
      throw error;
    }

    console.log('🟢 Raw orders data from Supabase:', JSON.stringify(orders, null, 2));

    if (!orders || orders.length === 0) {
      console.warn('⚠️ No orders found.');
      return NextResponse.json([]);
    }

    // ✅ Handle both array & single-object shapes safely
    const formatted = orders.map((order: any) => {
      const userFullname =
        Array.isArray(order.users)
          ? order.users[0]?.fullname ?? 'Unknown'
          : order.users?.fullname ?? 'Unknown';

      const productNames =
        Array.isArray(order.order_items)
          ? order.order_items.map((item: any) => {
              if (Array.isArray(item.medicines)) {
                return item.medicines[0]?.name ?? 'Unknown';
              }
              return item.medicines?.name ?? 'Unknown';
            })
          : [];

      return {
        id: order.id,
        user_fullname: userFullname,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        product_names: productNames,
      };
    });

    console.log('🧩 Formatted orders sent to frontend:', JSON.stringify(formatted, null, 2));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('🔥 Unexpected error in GET /orders:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
