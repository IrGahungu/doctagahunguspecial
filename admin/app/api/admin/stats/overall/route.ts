// Moved to /api/admin/stats/overall/route.ts to match frontend fetch
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Admin Revenue - Service Fees from Orders
    const { data: ordersData } = await supabaseAdmin
      .from("orders")
      .select("service_fee");
    
    const serviceFees = ordersData?.reduce((sum, o) => sum + (Number(o.service_fee) || 0), 0) || 0;

    // 2. Admin Revenue - Login/Access Fees from wallet_transactions
    const { data: walletData } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount")
      .or("description.ilike.%View Access Fee%,description.ilike.%Wallet Deduction%,description.ilike.%Login Fee%,description.ilike.%Access Fee%");

    const loginFees = walletData?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    // 2b. Admin Revenue - Bus Booking Payments
    const { data: busWalletData } = await supabaseAdmin
      .from("wallet_transactions")
      .select("amount")
      .ilike("description", "Bus Booking Payment%");

    const busFees = busWalletData?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    // 3. Approved Doctors
    const { data: doctors } = await supabaseAdmin
      .from("doctor_applications")
      .select("id, name, image")
      .eq("status", "approved");

    // 4. Approved Hospitals
    const { data: hospitals } = await supabaseAdmin
      .from("hospital_applications")
      .select("id, name, image")
      .eq("status", "approved");

    // 5. Approved Insurances
    const { data: insurances } = await supabaseAdmin
      .from("insurance_applications")
      .select("id, name, image")
      .eq("status", "approved");

    // 6. Approved Pharmacies + Revenue from delivered orders
    // Logic: Join pharmacy -> stock -> order_items -> orders (status = 'Delivered')
    const { data: pharmaciesRaw, error: pharmError } = await supabaseAdmin
      .from("pharmacy_applications")
      .select(`
        id, 
        name, 
        image,
        stock (
          order_items (
            price,
            quantity,
            status
          )
        )
      `)
      .eq("status", "approved");

    if (pharmError) {
      console.error("DEBUG: Supabase error fetching pharmacies:", pharmError);
    }
    console.log("DEBUG: pharmaciesRaw count:", pharmaciesRaw?.length || 0);
    // Log a sample to check structure
    console.log("DEBUG: pharmaciesRaw sample:", JSON.stringify(pharmaciesRaw?.[0], null, 2));

    const pharmacies = (pharmaciesRaw || []).map(p => {
      let revenue = 0;
      p.stock?.forEach((s: any) => {
        s.order_items?.forEach((item: any) => {
          if (item.status === 'Delivered') {
            revenue += (Number(item.price) * Number(item.quantity));
          }
        });
      });
      return { id: p.id, name: p.name, image: p.image, revenue };
    });

    console.log("DEBUG: Final processed pharmacies list:", pharmacies);

    return NextResponse.json({
      doctors: (doctors || []).map(d => ({ ...d, revenue: 0 })), // Revenue logic for docs can be added later
      hospitals: (hospitals || []).map(h => ({ ...h, revenue: 0 })),
      insurances: (insurances || []).map(i => ({ ...i, revenue: 0 })),
      pharmacies,
      admin: {
        serviceFees,
        loginFees,
        busFees,
        total: serviceFees + loginFees + busFees
      }
    });
  } catch (error: any) {
    console.error("Overall stats API error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch overall stats" },
      { status: 500 }
    );
  }
}