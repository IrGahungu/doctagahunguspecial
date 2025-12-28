
"use server";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export async function updateBookingStatus(bookingId: string, updates: any) {
  const cookieStore = await cookies();
  const doctorId = cookieStore.get("doctorToken")?.value;

  if (!doctorId) {
    return { error: "Unauthorized: No session found." };
  }

  // Verify that the booking belongs to the doctor to prevent unauthorized updates
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("doctor_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Booking not found." };
  }

  if (booking.doctor_id !== doctorId) {
    return { error: "Unauthorized: This booking does not belong to you." };
  }

  // Perform the update using the admin client
  const { error } = await supabaseAdmin
    .from("bookings")
    .update(updates)
    .eq("id", bookingId);

  if (error) {
    console.error("Server update error:", error);
    return { error: error.message };
  }

  return { error: null };
}
