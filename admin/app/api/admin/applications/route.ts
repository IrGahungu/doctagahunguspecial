import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "doctor";
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

    const tableNames: Record<string, string> = {
      doctor: "doctor_applications",
      pharmacy: "pharmacy_applications",
      hospital: "hospital_applications",
      insurance: "insurance_applications",
    };

    const tableName = tableNames[type] || "doctor_applications";
    let query = supabaseAdmin.from(tableName);

    let selectStr = "*";
    if (type === "doctor") {
      selectStr = `
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
      `;
    }

    const { data, error } = await query
      .select(selectStr)
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

    const { id, status, rejection_reason, type } = await request.json();

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

    const tableNames: Record<string, string> = {
      doctor: "doctor_applications",
      pharmacy: "pharmacy_applications",
      hospital: "hospital_applications",
      insurance: "insurance_applications",
    };

    const roles: Record<string, string> = {
      doctor: "doctor",
      pharmacy: "pharmacy",
      hospital: "hospital",
      insurance: "insurance",
    };

    const tableName = tableNames[type] || "doctor_applications";
    const targetRole = roles[type] || "doctor";

    // Update the application status AND return the email
    const { data: application, error: appError } = await supabaseAdmin
      .from(tableName)
      .update(updatePayload)
      .eq("id", id)
      .select("email")
      .single();

    if (appError || !application) {
      console.error("Error updating application:", appError);
      return NextResponse.json({ error: "Failed to update application." }, { status: 500 });
    }

    // If approved, update users.role using email
    if (status === 'approved') {
      const { error: userUpdateError } = await supabaseAdmin.rpc('update_user_role_by_email', { p_email: application.email, p_role: targetRole });

      if (userUpdateError) {
        return NextResponse.json({ error: "Failed to update doctor role." }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Application status updated successfully." });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
