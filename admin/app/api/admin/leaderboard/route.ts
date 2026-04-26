import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Forbidden: No token provided." },
        { status: 403 }
      );
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      console.error("JWT VERIFY ERROR:", err);
      return NextResponse.json(
        { error: err?.message || "Server error" },
        { status: 500 }
      );
    }

    if (payload.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }

    // Fetch top 50 users by engagement points from Supabase
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, fullname, whatsapp_number, country, engagement_points")
      .order("engagement_points", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Leaderboard fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard data." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Leaderboard route error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
