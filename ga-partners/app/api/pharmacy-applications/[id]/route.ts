import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing application ID" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("pharmacy_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const json = await request.json();
    const { password, confirmPassword, ...body } = json;

    const { data, error } = await supabaseAdmin
      .from("pharmacy_applications")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Sync updates to pharmacy_users table if relevant fields are present
    if (data?.email) {
      const userUpdates: Record<string, any> = {};
      if (body.name !== undefined) userUpdates.name = body.name;
      if (body.image !== undefined) userUpdates.image = body.image;
      if (body.status !== undefined) userUpdates.status = body.status;
      if (body.whatsapp_number !== undefined) userUpdates.whatsapp_number = body.whatsapp_number;
      if (body.country !== undefined) userUpdates.country = body.country;
      if (body.payment_id !== undefined) userUpdates.payment_id = body.payment_id;
      if (body.location !== undefined) userUpdates.location = body.location;
      if (body.origin_country !== undefined) userUpdates.origin_country = body.origin_country;
      
      if (Object.keys(userUpdates).length > 0) {
        console.log(`Syncing pharmacy_users for ${data.email}:`, userUpdates);
        
        const { data: updatedUsers, error: userError } = await supabaseAdmin
          .from("pharmacy_users")
          .update(userUpdates)
          .eq("email", data.email)
          .select();
          
        if (userError) {
          console.error("Error syncing pharmacy_users:", userError);
        } else if (!updatedUsers || updatedUsers.length === 0) {
          console.warn(`WARNING: Sync successful but NO rows updated in pharmacy_users. Check if email '${data.email}' exists in pharmacy_users table.`);
        } else {
          console.log(`pharmacy_users synced successfully. Updated ${updatedUsers.length} row(s).`);
        }
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}