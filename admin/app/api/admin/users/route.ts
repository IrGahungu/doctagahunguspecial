import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin(request: NextRequest) {
  const tokenCookie = request.cookies.get("token");
  if (!tokenCookie) return { isAdmin: false, error: "Missing token", status: 401 };

  try {
    const payload = await verifyToken(tokenCookie.value);
    if (payload.role !== "admin") {
      return { isAdmin: false, error: "Forbidden", status: 403 };
    }
    return { isAdmin: true };
  } catch (err) {
    return { isAdmin: false, error: "Invalid token", status: 401 };
  }
}

// GET all users
export async function GET(request: NextRequest) {
  const { isAdmin, error, status } = await checkAdmin(request);
  if (!isAdmin) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "users"; // Default to 'users'

  let query = supabaseAdmin.from(type).select("*");

  // Special case for medicines to fetch related data
  if (type === "medicines") {
    query = supabaseAdmin.from("medicines").select(`
      *,
      medicine_pharmacies ( pharmacy_id, locations, insurances )
    `);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    console.error(`Error fetching ${type}:`, dbError);
    return NextResponse.json({ error: `Failed to fetch ${type}` }, { status: 500 });
  }

  // For consistency, wrap the data in an object if the type is medicines
  if (type === "medicines") {
    return NextResponse.json({ medicines: data });
  }
  return NextResponse.json(data);
}

// DELETE a user
export async function DELETE(request: NextRequest) {
  const { isAdmin, error, status } = await checkAdmin(request);
  if (!isAdmin) return NextResponse.json({ error }, { status });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

  const { error: dbError } = await supabaseAdmin.from("users").delete().eq("id", id);

  if (dbError) {
    console.error("Error deleting user:", dbError);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }

  return NextResponse.json({ message: "User deleted successfully" });
}

// UPDATE a user's role, verification status, or wallet balance
export async function PUT(request: NextRequest) {
  const { isAdmin, error, status } = await checkAdmin(request);
  if (!isAdmin) return NextResponse.json({ error }, { status });

  const { id, role, is_verified, wallet_balance } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const updates: { role?: string; is_verified?: boolean; wallet_balance?: number } = {};

  // Update role if provided
  if (role !== undefined) {
    if (role !== "admin" && role !== "user") {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }
    updates.role = role;
  }

  // Update verification status if provided
  if (is_verified !== undefined) {
    updates.is_verified = is_verified;
  }

  // Update wallet balance if provided
  if (wallet_balance !== undefined) {
    if (typeof wallet_balance !== "number" || wallet_balance < 0) {
      return NextResponse.json({ error: "Invalid wallet balance" }, { status: 400 });
    }
    updates.wallet_balance = wallet_balance;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields provided to update" }, { status: 400 });
  }

  // Perform the update in Supabase
  const { data, error: dbError } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", id)
    .select("id, role, is_verified, wallet_balance")
    .single();

  if (dbError) {
    console.error("Error updating user:", dbError);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json(data);
}
