// ga-partners/app/doctor/dashboard/page.tsx
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import DashboardClient from "./DashboardClient";

export default async function PharmacyDashboardPage() {
  const cookie = (await cookies()).get("pharmacyToken")?.value;
  if (!cookie) {
    // not logged in
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Please login to see your dashboard</h2>
        <Link href="/login" className="text-blue-600 underline">Go to login</Link>
      </div>
    );
  }

  // Find application by id
  const { data: app } = await supabaseAdmin
    .from("pharmacy_applications")
    .select("*")
    .eq("id", cookie)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!app) {
    return (
      <div className="p-8">
        <h2>Welcome</h2>
        <p>You have not submitted an application yet.</p>
        <Link href="/apply/pharmacy" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white">Apply as Pharmacy</Link>
      </div>
    );
  }

  return <DashboardClient app={app} />;
}
