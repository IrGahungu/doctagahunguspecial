import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";

export async function GET(request: Request) {
  try {
    // Fetch all orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, total_amount, subtotal, service_fee, user_id, users(fullname)")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Fetch all order items and join with stock (medicines)
    // The error "Could not find a relationship between 'order_items' and 'medicines'"
    // suggests that 'medicines' was used here instead of 'stock'.
    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .select("*, stock(id, name, image, pharmacy_applications(name))") // Join with stock and its associated pharmacy
      .order("created_at", { ascending: false });

    if (orderItemsError) {
      console.error("Error fetching order items:", orderItemsError);
      return NextResponse.json({ error: orderItemsError.message }, { status: 500 });
    }

    // Map order items to their respective orders
    const ordersWithDetails = orders.map(order => {
      const itemsForOrder = orderItems.filter(item => item.order_id === order.id).map(item => ({
        id: item.id,
        stock_id: item.stock_id,
        quantity: item.quantity,
        price: item.price,
        status: item.status,
        pharmacy_name: (item.stock as any)?.pharmacy_applications?.name || "N/A",
        product_name: item.stock?.name || "Unknown Product",
        product_image_url: item.stock?.image 
          ? (item.stock.image.startsWith('http') 
              ? item.stock.image 
              : `${MEDICINE_URL_PREFIX}${item.stock.image}`)
          : null,
      }));

      return {
        ...order,
        status: itemsForOrder[0]?.status || "Pending",
        customer_name: (order.users as any)?.fullname || "N/A",
        items: itemsForOrder,
      };
    });

    return NextResponse.json(ordersWithDetails);
  } catch (error: any) {
    console.error("Unhandled error in GET /api/admin/orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ids, status } = body;

    if (!id && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: "Order ID or IDs are required" }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    let query = supabaseAdmin.from("order_items").update({ status });

    if (ids) {
      query = query.in("order_id", ids);
    } else {
      query = query.eq("order_id", id);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error("Error updating order status:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ status });
  } catch (error: any) {
    console.error("Unhandled error in PUT /api/admin/orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}