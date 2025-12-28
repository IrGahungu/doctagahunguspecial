// app/api/admin/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// -------------------------
// GET single order by ID
// -------------------------
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        status,
        created_at,
        users(fullname),
        order_items(
          id,
          quantity,
          price,
          medicines(name)
        )
      `)
      .eq("id", id)
      .maybeSingle(); // ← safer than single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Format data for frontend
    const formatted = {
      id: order.id,
      user_fullname: (order.users as unknown as { fullname: string } | null)?.fullname ?? "Unknown",
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at,
      items: order.order_items?.map((item: any) => ({
        id: item.id,
        medicine_name: item.medicines?.name ?? "Unknown",
        quantity: item.quantity,
        price: item.price,
      })) ?? [],
    };

    return NextResponse.json(formatted);
  } catch (err) {
    console.error(`[ORDER_FETCH_ERROR: ${id}]`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// -------------------------
// PUT update order status
// -------------------------
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json();
  const { status } = body;

  if (!["Pending", "Packed", "Delivered", "Cancelled"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Order status updated" });
  } catch (err) {
    console.error(`[ORDER_UPDATE_ERROR: ${id}]`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
