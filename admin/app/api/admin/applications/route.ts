import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const { data, error } = await supabaseAdmin
      .from("doctor_applications")
      .select(`
        *,
        rejection_reason,
        doctor_users (
          name,
          email, 
          whatsapp_number,
          specialty,
          location,
          bio,
          booking_type,
          availability,
          country,
          origin_country,
          payment_id,
          consultation_fee_online,
          consultation_fee_offline,
          image,
          agreement_image,
          id_image,
          medical_degree_image,
          medical_licence_image,
          proof_of_practice_image
        )
      `)
      // Fetch all applications to show them in the admin dashboard regardless of status
      // .eq("status", "pending");
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json(
        { error: "Failed to fetch applications." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Forbidden: No token provided." }, { status: 403 });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only." }, { status: 403 });
    }

    const { id, status, rejection_reason } = await request.json();

    if (!id || !status || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: "Bad Request: Missing or invalid 'id' or 'status'." }, { status: 400 });
    }

    if (status === 'rejected' && !rejection_reason) {
      return NextResponse.json({ error: "Bad Request: Rejection reason is required." }, { status: 400 });
    }

    const updatePayload: { status: string; rejection_reason?: string | null } = { status };
    if (status === 'rejected') {
      updatePayload.rejection_reason = rejection_reason;
    } else if (status === 'approved' || status === 'pending') {
      // Clear rejection reason on approval or resubmission to pending
      updatePayload.rejection_reason = null;
    }

    // Update the application status AND return the email
    const { data: application, error: appError } = await supabaseAdmin
      .from("doctor_applications")
      .update(updatePayload)
      .eq("id", id)
      .select("email")
      .single();

    if (appError || !application) {
      console.error("Error updating application:", appError);
      return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
    }

    // If approved, update doctor_users.role using email
    if (status === 'approved') {
      const { error: userUpdateError } = await supabaseAdmin.rpc('update_user_role_by_email', { p_email: application.email, p_role: 'doctor' });

      if (userUpdateError) {
        return NextResponse.json({ error: "Failed to update doctor role." }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Application status updated successfully." });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
