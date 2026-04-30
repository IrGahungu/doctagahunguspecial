import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin(request: NextRequest) {
  // Check for token in cookies or Authorization header
  let token = request.cookies.get("token")?.value;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) return { isAdmin: false, error: "Missing token", status: 401 };

  try {
    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return { isAdmin: false, error: "Forbidden", status: 403 };
    }
    return { isAdmin: true };
  } catch (err) {
    return { isAdmin: false, error: "Invalid token", status: 401 };
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin, error, status } = await checkAdmin(request);
  if (!isAdmin) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const { admin_reply } = await request.json();

  const { data, error: dbError } = await supabaseAdmin
    .from("reviews")
    .update({ admin_reply })
    .eq("id", id)
    .select()
    .single();

  if (dbError) {
    console.error("Error saving review reply:", dbError);
    return NextResponse.json({ error: "Failed to save reply" }, { status: 500 });
  }

  return NextResponse.json(data);
}
