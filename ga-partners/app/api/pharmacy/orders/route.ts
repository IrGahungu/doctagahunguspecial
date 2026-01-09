import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pharmacy_id = searchParams.get("pharmacy_id");

  console.log(`[GET Orders] Fetching for pharmacy_id: ${pharmacy_id}`);

  if (!pharmacy_id) {
    return NextResponse.json({ error: "Pharmacy ID is required" }, { status: 400 });
  }

  try {
    // 1. Fetch order items that belong to this pharmacy (via stock)
    // We assume 'order_items' has a 'stock_id' that links to 'stock' table
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("order_items")
      .select("*, stock!inner(pharmacy_id, name, image)") // Ensure 'status' is selected if it exists on order_items
      .eq("stock.pharmacy_id", pharmacy_id);

    console.log(`[GET Orders] Found ${items?.length || 0} items for pharmacy`);
    if (itemsError) throw itemsError;

    if (!items || items.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Get unique Order IDs from these items
    const orderIds = [...new Set(items.map((item) => item.order_id))];

    // 3. Fetch the actual orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, total_amount, subtotal, service_fee, user_id") // Select specific columns, excluding 'status'
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    console.log(`[GET Orders] Found ${orders?.length || 0} orders matching items`);
    if (ordersError) throw ordersError;

    // 4. Combine orders with their specific items for this pharmacy
    const ordersWithItems = orders.map((order) => {
      const pharmacyItems = items
        .filter((item) => item.order_id === order.id)
        .map((item) => ({
          id: item.id,
          product_name: item.stock?.name || "Unknown Product",
          quantity: item.quantity,
          price: item.price,
          image: item.stock?.image,
          status: item.status // Include item status
        }));

      // Derive the order status for this pharmacy based on its items.
      // If items have a status, use the first one (assuming bulk update), otherwise default to 'Pending'
      const pharmacyStatus = (pharmacyItems.length > 0 && pharmacyItems[0].status) ? pharmacyItems[0].status : "Pending";

      return { ...order, status: pharmacyStatus, items: pharmacyItems };
    });

    return NextResponse.json(ordersWithItems);
  } catch (error: any) {
    console.error("Error fetching pharmacy orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, pharmacy_id } = body;
    console.log(`[PUT Orders] Updating order ${id} to status ${status} for pharmacy ${pharmacy_id}`);

    if (!id || !status || !pharmacy_id) {
      return NextResponse.json({ error: "Order ID, status, and pharmacy ID are required" }, { status: 400 });
    }

    // 1. Get the stock IDs belonging to this pharmacy to ensure we only update their items
    const { data: stockData, error: stockError } = await supabaseAdmin
      .from("stock")
      .select("id")
      .eq("pharmacy_id", pharmacy_id);

    if (stockError) throw stockError;
    const stockIds = stockData.map((s) => s.id);

    // 2. Update the status of the items in this order that belong to this pharmacy
    const { data, error } = await supabaseAdmin
      .from("order_items")
      .update({ status }) // This assumes you added a 'status' column to 'order_items'
      .eq("order_id", id)
      .in("stock_id", stockIds)
      .select();

    console.log(`[PUT Orders] Updated ${data?.length || 0} items`);
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}