"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { updateBookingStatus } from "./actions"

type DoctorApplication = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  image?: string | null;
};

type Availability = {
  date: string;
  times: string[];
  booking_type?: "online" | "in-office" | "both";
  consultation_fee_online?: string;
  consultation_fee_offline?: string;
};

type Booking = {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  type: "online" | "in-office";
  status: "pending" | "confirmed" | "completed" | "cancelled";
  payment_status: "paid" | "unpaid" | "refunded";
  ticket_number?: string;
  amount?: number;
  user_id?: string;
};

interface DashboardClientProps {
  app: DoctorApplication;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardClient({ app }: DashboardClientProps) {
  const [showStatus, setShowStatus] = useState(false);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loadingTab, setLoadingTab] = useState("");
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    specialty: "",
    bio: "",
    whatsapp_number: "",
    country: "",
    origin_country: "",
    payment_id: "",
    image: "",
    password: "",
    confirmPassword: "",
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);

  const [availabilityForm, setAvailabilityForm] = useState({
    location: [] as string[],
    availability: [] as Availability[],
    booking_type: "online",
    consultation_fee_online: "",
    consultation_fee_offline: "",
  });
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalPatients: 0,
    todayBookings: 0,
    totalRevenue: 0,
    completedBookings: 0,
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [revenueChartData, setRevenueChartData] = useState<{ date: string; revenue: number }[]>([]);

  const statusColorMap = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-red-500",
  };

  useEffect(() => {
    const loadData = async () => {
      if (activeTab === "availability" && app.id && app.status === "approved") {
        setIsAvailabilityLoading(true);
        fetch(`/api/doctor-applications/${app.id}`)
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`Failed to fetch data: ${res.status} ${text}`);
            }
            return res.json();
          })
          .then((data) => {
            setAvailabilityForm({
              location: data.location || [],
              availability: data.availability || [],
              booking_type: data.booking_type || "online",
              consultation_fee_online: data.consultation_fee_online || "",
              consultation_fee_offline: data.consultation_fee_offline || "",
            });
          })
          .catch((err) => console.error("Failed to load availability", err))
          .finally(() => setIsAvailabilityLoading(false));
      }

      if (activeTab === "profile" && app.id) {
        setIsProfileLoading(true);
        fetch(`/api/doctor-applications/${app.id}`)
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`Failed to fetch data: ${res.status} ${text}`);
            }
            return res.json();
          })
          .then((data) => {
            setProfileForm({
              name: data.name || "",
              email: data.email || "",
              specialty: data.specialty || "",
              bio: data.bio || "",
              whatsapp_number: data.whatsapp_number || "",
              country: data.country || "",
              origin_country: data.origin_country || data.originCountry || "",
              payment_id: data.payment_id || "",
              image: data.image || "",
              password: "",
              confirmPassword: "",
            });
          })
          .catch((err) => console.error("Failed to load profile", err))
          .finally(() => setIsProfileLoading(false));
      }

      if (activeTab === "bookings" && app.id) {
        setIsBookingsLoading(true);
        const { data, error } = await supabase
          .from("bookings")
          .select(`
          *,
          users:users!bookings_user_id_fkey (
          id,
          fullname,
          whatsapp_number
          )
          `)
          .eq("doctor_id", app.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to load bookings", error.message || error);
        } else {
          console.log("Raw Bookings Data:", data); // Debug: See the full structure
          const mappedBookings = (data || []).map((b: any) => {
            const user = b.users;

            return {
              id: b.id,
              patient_name:
                b.patient_name ||
                user?.fullname ||
                user?.whatsapp_number ||
                (b.user_id
                  ? `User ${b.user_id.slice(0, 6)}`
                  : "Unknown"),
              appointment_date: b.date,
              appointment_time: b.time,
              type: b.type,
              status: b.status,
              payment_status: b.payment_status || (b.amount > 0 ? "paid" : "unpaid"),
              ticket_number: b.ticket_number,
              amount: b.amount,
              user_id: b.user_id,
            };
          });

          setBookings(mappedBookings as Booking[]);
        }
        setIsBookingsLoading(false);
      }

      if (activeTab === "dashboard" && app.id) {
        setIsDashboardLoading(true);
        Promise.all([
          supabase
            .from('bookings')
            .select('*, users(*)')
            .eq('doctor_id', app.id)
            .then(({ data }) => data || []),
          fetch(`/api/doctor-applications/${app.id}`).then((res) => (res.ok ? res.json() : null)),
        ])
          .then(([bookingsData, doctorData]) => {
            console.log("Dashboard Raw Bookings:", bookingsData); // Debug
            const bookingsList = (bookingsData as any[]).map((b) => {
              const user = Array.isArray(b.users) ? b.users[0] : b.users;
              console.log(`Dashboard Booking ${b.id} User:`, user); // Debug
              return {
                id: b.id,
                patient_name: b.patient_name || user?.fullname || user?.name || user?.whatsapp_number || (b.user_id ? `User ${b.user_id.slice(0, 6)}` : 'Unknown'),
                appointment_date: b.date,
                appointment_time: b.time,
                type: b.type,
                status: b.status,
                payment_status: b.payment_status || (b.amount > 0 ? 'paid' : 'unpaid'),
                ticket_number: b.ticket_number,
                amount: b.amount,
                user_id: b.user_id,
              };
            }) as Booking[];

            setBookings(bookingsList);
            const doctor = doctorData || {};

            const uniquePatients = new Set(bookingsList.map((b: Booking) => b.patient_name)).size;

            const today = new Date().toISOString().split("T")[0];
            const todayBookingsCount = bookingsList.filter((b: Booking) => b.appointment_date === today).length;

            const completed = bookingsList.filter((b: Booking) => b.status === "completed").length;

            let revenue = 0;
            const onlineFee = parseFloat((doctor.consultation_fee_online || "0").toString().replace(/[^0-9.]/g, "")) || 0;
            const offlineFee = parseFloat((doctor.consultation_fee_offline || "0").toString().replace(/[^0-9.]/g, "")) || 0;

            const revenueMap: Record<string, number> = {};

            bookingsList.forEach((b: Booking) => {
              if (b.payment_status === "paid") {
                let fee = 0;
                if (b.type === "online") fee = onlineFee;
                else fee = offlineFee;

                revenue += fee;
                revenueMap[b.appointment_date] = (revenueMap[b.appointment_date] || 0) + fee;
              }
            });

            const chartData = Object.entries(revenueMap)
              .map(([date, amount]) => ({ date, revenue: amount }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setRevenueChartData(chartData);

            setDashboardStats({
              totalPatients: uniquePatients,
              todayBookings: todayBookingsCount,
              totalRevenue: revenue,
              completedBookings: completed,
            });
          })
          .catch((err) => console.error("Failed to load dashboard stats", err))
          .finally(() => setIsDashboardLoading(false));
      }
    };
    loadData();
  }, [activeTab, app.id, app.status]);

  // Helper functions for the availability form
  function handleAddLocation() {
    setAvailabilityForm((prev) => ({ ...prev, location: [...prev.location, ""] }));
  }

  function handleRemoveLocation(index: number) {
    setAvailabilityForm((prev) => ({
      ...prev,
      location: prev.location.filter((_, i) => i !== index),
    }));
  }

  function handleLocationChange(index: number, value: string) {
    const updated = [...availabilityForm.location];
    updated[index] = value;
    setAvailabilityForm((prev) => ({ ...prev, location: updated }));
  }

  function handleAddAvailability() {
    setAvailabilityForm((prev) => ({
      ...prev,
      availability: [...prev.availability, { 
        date: "", 
        times: [],
        booking_type: "online",
        consultation_fee_online: "",
        consultation_fee_offline: ""
      }],
    }));
  }

  function handleRemoveAvailability(index: number) {
    setAvailabilityForm((prev) => ({
      ...prev,
      availability: prev.availability.filter((_, i) => i !== index),
    }));
  }

  function handleAvailabilityChange(index: number, field: keyof Availability, value: string) {
    setAvailabilityForm((prev) => {
      const updatedAvailability = [...prev.availability];
      // Create a shallow copy of the item being modified to ensure React detects the change
      updatedAvailability[index] = { ...updatedAvailability[index] };

      if (field === "times") {
        updatedAvailability[index].times = value.split(",").map((t) => t.trim());
      } else {
        (updatedAvailability[index] as any)[field] = value;
      }
      return { ...prev, availability: updatedAvailability };
    });
  }

  async function handleSaveAvailability() {
    setIsSavingAvailability(true);
    try {
      const payload = {
        ...availabilityForm,
        location: availabilityForm.location.filter((l) => l.trim() !== ""),
        availability: availabilityForm.availability.map((a) => ({
          ...a,
          times: a.times.filter((t) => t.trim() !== ""),
          booking_type: a.booking_type || "online",
        })),
      };

      const res = await fetch(`/api/doctor-applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to update");
      }
      alert("Availability updated successfully!");
      setIsEditingAvailability(false);
    } catch (e: any) {
      console.error(e);
      alert(`Error updating availability: ${e.message || "Unknown error"}`);
    } finally {
      setIsSavingAvailability(false);
    }
  }

  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfileImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "doctor-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setProfileForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setIsUploadingProfileImage(false);
    }
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true);

    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      alert("Passwords do not match!");
      setIsSavingProfile(false);
      return;
    }

    try {
      const res = await fetch(`/api/doctor-applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      alert("Profile updated successfully!");
      router.refresh();
      setIsEditingProfile(false);
    } catch (e) {
      console.error(e);
      alert("Error updating profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleUpdateStatus(bookingId: string, newStatus: "confirmed" | "cancelled" | "completed") {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    if (newStatus === "cancelled" && !window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    const updates: any = { status: newStatus };

    if (newStatus === "confirmed") {
      // Generate a ticket number
      const existingTickets = bookings
        .map((b) => b.ticket_number)
        .filter((t) => t && t.startsWith("#"))
        .map((t) => parseInt(t!.replace("#", ""), 10))
        .filter((n) => !isNaN(n));

      const maxTicket = existingTickets.length > 0 ? Math.max(...existingTickets) : 0;
      updates.ticket_number = `#${maxTicket + 1}`;
    } else if (newStatus === "cancelled" && booking.payment_status === "paid") {
      console.log("Starting refund process for booking:", booking);
      // Automatically refund if paid
      updates.payment_status = "refunded";

      if (booking.user_id && booking.amount) {
        console.log(`Fetching wallet for user ${booking.user_id}`);
        const { data: userData, error: userFetchError } = await supabase
          .from("users")
          .select("wallet_balance")
          .eq("id", booking.user_id)
          .single();

        if (userFetchError) {
          console.error("Error fetching user wallet balance:", userFetchError);
        }

        if (userData) {
          const refundAmount = Number(booking.amount);
          const currentBalance = Number(userData.wallet_balance || 0);
          const newBalance = currentBalance + refundAmount;
          console.log(`Wallet found. Balance: ${currentBalance}. Refunding: ${refundAmount}. New Balance: ${newBalance}`);

          // Use RPC to bypass RLS update restrictions
          const { error: refundError } = await supabase.rpc("refund_patient", {
            patient_id: booking.user_id,
            refund_amount: refundAmount,
          });

          if (refundError) {
            console.error("Error refunding wallet:", refundError);
            alert(`Refund failed: ${refundError.message}`);
            return;
          } else {
            console.log("Refund successful.");
          }
        } else {
          console.warn("User not found for this refund.");
          alert("Refund failed: User wallet not found.");
          return;
        }
      } else {
        console.warn("Cannot refund: Missing user_id or amount is 0/undefined.", { user_id: booking.user_id, amount: booking.amount });
        alert("Refund failed: Missing booking details.");
        return;
      }
    }

    const { error } = await updateBookingStatus(bookingId, updates);

    if (error) {
      console.error("Failed to update booking status", error);
      alert(`Failed to update status: ${error || "Unknown error"}`);
    } else {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)));
      if (newStatus === "cancelled" && updates.payment_status === "refunded") {
        alert("Booking cancelled and payment has been refunded.");
      }
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/doctor/logout", { method: "POST" });
      router.refresh();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
      router.push("/login");
    }
  }

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setLoadingTab(tab);

    setTimeout(() => {
      if (tab === "status") setShowStatus(true);
      if (tab === "availability") setIsEditingAvailability(false);
      if (tab === "profile") setIsEditingProfile(false);
      setLoadingTab("");
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-6 flex flex-col space-y-4 border-r border-gray-200 overflow-y-auto">
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shadow-sm mb-3 overflow-hidden">
            {app.image ? (
              <img src={app.image} alt={app.name} className="h-full w-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="text-sm text-gray-500 font-medium break-all text-center px-2">{app.email}</div>
        </div>
        <div className="relative">
          <button
            onClick={() => handleNavClick("dashboard")}
            disabled={loadingTab === "dashboard"}
            className="relative w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition disabled:bg-blue-400"
          >
            {loadingTab === "dashboard" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </>
            )}
          </button>
          {activeTab === "dashboard" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("availability")}
            disabled={loadingTab === "availability"}
            className="relative w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition disabled:bg-orange-400"
          >
            {loadingTab === "availability" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Availability
              </>
            )}
          </button>
          {activeTab === "availability" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-orange-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("bookings")}
            disabled={loadingTab === "bookings"}
            className="relative w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition disabled:bg-green-400"
          >
            {loadingTab === "bookings" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Bookings
              </>
            )}
          </button>
          {activeTab === "bookings" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-green-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("profile")}
            disabled={loadingTab === "profile"}
            className="relative w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:bg-indigo-400"
          >
            {loadingTab === "profile" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My profile
              </>
            )}
          </button>
          {activeTab === "profile" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("status")}
            className="relative w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 disabled:bg-purple-400 transition"
            disabled={loadingTab === "status"}
          >
            {loadingTab === "status" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Status
              </>
            )}
          </button>
          {activeTab === "status" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-purple-600 rounded-full"></div>}
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="relative w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-5">
          <h2 className="text-center text-xl font-semibold text-gray-800">
            Hi and welcome dear {app.name} on Dr. Gahungu Platform
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">

            {activeTab === "dashboard" && (
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-800">Dashboard Overview</h3>
                {isDashboardLoading ? (
                  <div className="text-center py-10">Loading stats...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2 truncate">Total Patients</h4>
                      <div className="text-3xl font-bold text-gray-800">{dashboardStats.totalPatients}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2 truncate">Today's Bookings</h4>
                      <div className="text-3xl font-bold text-blue-600">{dashboardStats.todayBookings}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2 truncate">Total Revenue</h4>
                      <div className="text-3xl font-bold text-green-600">{dashboardStats.totalRevenue.toLocaleString()} BIF</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2 truncate">Completed Bookings</h4>
                      <div className="text-3xl font-bold text-purple-600">{dashboardStats.completedBookings}</div>
                    </div>
                  </div>
                )}

                {!isDashboardLoading && (
                  <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-gray-800 font-bold mb-4">Revenue Over Time</h4>
                      <div className="h-80 w-full">
                        {revenueChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} BIF`, 'Revenue']} />
                              <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400 italic border-2 border-dashed border-gray-100 rounded-lg">
                            No revenue data available to display
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-gray-800 font-bold mb-4">Recent Activity</h4>
                      <div className="space-y-4 overflow-y-auto max-h-80">
                        {bookings.length > 0 ? (
                          [...bookings]
                            .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
                            .slice(0, 5)
                            .map((booking) => (
                              <div key={booking.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${booking.status === 'confirmed' ? 'bg-green-500' :
                                  booking.status === 'pending' ? 'bg-yellow-500' :
                                    booking.status === 'completed' ? 'bg-purple-500' :
                                      booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-300'
                                  }`} />
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {booking.patient_name}
                                  </p>
                                  <p className="text-xs text-gray-500 mb-1">
                                    {booking.appointment_date} • {booking.appointment_time}
                                  </p>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize border ${booking.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' :
                                    booking.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                      booking.status === 'completed' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                          'bg-gray-50 text-gray-600 border-gray-100'
                                    }`}>
                                    {booking.status === 'confirmed' ? 'Confirmed (Incomplete)' : booking.status === 'completed' ? 'Confirmed (Complete)' : booking.status}
                                  </span>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-gray-400 italic">
                            No recent activity found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "status" && showStatus && (
              <div className="flex flex-col items-center">
                <div className="text-center">
                  <p>
                    <strong>Status:</strong> <span className={`${statusColorMap[app.status]} font-bold`}>{app.status}</span>
                  </p>
                  <p><strong>Submitted:</strong> {new Date(app.created_at).toLocaleString()}</p>
                  {app.status === "pending" && (
                    <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-2xl">
                      <p className="font-bold">Under Review</p>
                      <p>Your application is currently being reviewed by our team.</p>
                    </div>
                  )}
                  {app.status === "approved" && (
                    <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-2xl">
                      <p className="font-bold">Approved</p>
                      <p>Congratulations! Your application has been approved.</p>
                    </div>
                  )}
                  {app.status === "rejected" && (
                    <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-2xl">
                      <p className="font-bold">Rejected</p>
                      <p>Unfortunately, your application was rejected. Reason: {app.rejection_reason || "No reason provided"}</p>
                      <button
                        onClick={() => {
                          setIsNavigating(true);
                          // navigate to the apply page with the application id so the form can prefill
                          router.push(`/apply/doctor?id=${app.id}`);
                        }}
                        disabled={isNavigating}
                        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                      >
                        {isNavigating ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Loading Form...
                          </>
                        ) : (
                          "Edit and Resubmit Application"
                        )}
                      </button>

                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800">My Profile</h3>
                {isProfileLoading ? (
                  <div className="text-center py-10">Loading profile...</div>
                ) : !isEditingProfile ? (
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-6 mb-8">
                        <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm overflow-hidden border border-gray-200 shrink-0">
                          {profileForm.image ? (
                            <img src={profileForm.image} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-gray-900">{profileForm.name}</h4>
                          <p className="text-indigo-600 font-medium">{profileForm.specialty}</p>
                          <p className="text-gray-500 text-sm mt-1">{profileForm.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">WhatsApp</h5>
                          <p className="text-gray-900 font-medium">{profileForm.whatsapp_number || "Not set"}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment ID</h5>
                          <p className="text-gray-900 font-medium">{profileForm.payment_id || "Not set"}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Country</h5>
                          <p className="text-gray-900 font-medium">{profileForm.country || "Not set"}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Origin Country</h5>
                          <p className="text-gray-900 font-medium">{profileForm.origin_country || "Not set"}</p>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bio</h5>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 text-gray-700 whitespace-pre-wrap">
                          {profileForm.bio || "No bio provided."}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm font-medium whitespace-nowrap flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Update Profile
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Image Upload */}
                    <div className="flex items-center gap-6">
                      <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shadow-sm overflow-hidden border border-gray-200">
                        {profileForm.image ? (
                          <img src={profileForm.image} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-100 transition text-sm font-medium">
                          {isUploadingProfileImage ? (
                            <>
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Change Photo
                            </>
                          )}
                          <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" disabled={isUploadingProfileImage} />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="w-full border rounded-lg px-4 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Specialty</label>
                        <input
                          type="text"
                          value={profileForm.specialty}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, specialty: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">WhatsApp Number</label>
                        <input
                          type="text"
                          value={profileForm.whatsapp_number}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={profileForm.country}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Country of Origin</label>
                        <input
                          type="text"
                          value={profileForm.origin_country}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, origin_country: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Payment ID</label>
                        <input
                          type="text"
                          value={profileForm.payment_id}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, payment_id: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Bio</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                        rows={4}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-800 mb-4">Change Password <span className="text-sm font-normal text-gray-500">(Leave blank to keep current)</span></h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">New Password</label>
                          <input
                            type="password"
                            value={profileForm.password}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Confirm New Password</label>
                          <input
                            type="password"
                            value={profileForm.confirmPassword}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        disabled={isSavingProfile}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition flex items-center gap-2"
                      >
                        {isSavingProfile ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Saving...
                          </>
                        ) : "Save Profile"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800">My Bookings</h3>
                {isBookingsLoading ? (
                  <div className="text-center py-10">Loading bookings...</div>
                ) : bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 text-sm uppercase tracking-wider">
                          <th className="py-3 px-4">Patient</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 text-sm">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{booking.patient_name}</td>
                            <td className="py-3 px-4">
                              <div>{booking.appointment_date}</div>
                              <div className="text-xs text-gray-500">{booking.appointment_time}</div>
                            </td>
                            <td className="py-3 px-4 capitalize">
                              <span className={`px-2 py-1 rounded-full text-xs ${booking.type === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {booking.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 capitalize">
                              <span className={`px-2 py-1 rounded-full text-xs ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  booking.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                  booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {booking.status === 'confirmed' ? 'Confirmed (Incomplete)' : booking.status === 'completed' ? 'Confirmed (Complete)' : booking.status}
                              </span>
                              {booking.ticket_number && (
                                <div className="mt-2 text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block">
                                  Ticket: {booking.ticket_number}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 capitalize">
                              <span className={`font-medium ${booking.payment_status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                                {booking.payment_status}
                              </span>
                            </td>
                            <td className="py-3 px-4 flex gap-2">
                              {booking.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                                  className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 bg-green-50 px-2 py-1 rounded"
                                >
                                  Confirm
                                </button>
                              )}
                              {booking.status === 'confirmed' && (
                                <button
                                  onClick={() => handleUpdateStatus(booking.id, 'completed')}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 bg-blue-50 px-2 py-1 rounded"
                                >
                                  Complete
                                </button>
                              )}
                              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                <button
                                  onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                                  className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 bg-red-50 px-2 py-1 rounded"
                                >
                                  Cancel
                                </button>
                              )}
                              {/* <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">View</button> */}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p>No bookings found.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "availability" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800">Manage Availability & Fees</h3>

                {app.status !== "approved" ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                    You can only manage your availability and fees once your application has been approved.
                  </div>
                ) : isAvailabilityLoading ? (
                  <div className="text-center py-10">Loading details...</div>
                ) : !isEditingAvailability ? (
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Booking Type</h4>
                            <p className="text-gray-900 font-medium capitalize bg-white px-3 py-2 rounded border border-gray-200 inline-block">
                              {availabilityForm.booking_type}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Consultation Fees</h4>
                            <div className="space-y-1">
                              {(availabilityForm.booking_type === "online" || availabilityForm.booking_type === "both") && (
                                <p className="text-gray-700"><span className="font-medium">Online:</span> {availabilityForm.consultation_fee_online || "Not set"}</p>
                              )}
                              {(availabilityForm.booking_type === "in-office" || availabilityForm.booking_type === "both") && (
                                <p className="text-gray-700"><span className="font-medium">In-Office:</span> {availabilityForm.consultation_fee_offline || "Not set"}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Locations</h4>
                          {availabilityForm.location.length > 0 ? (
                            <ul className="list-disc list-inside text-gray-700 bg-white p-4 rounded border border-gray-200">
                              {availabilityForm.location.map((loc, idx) => (
                                <li key={idx}>{loc}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 italic">No locations added.</p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Availability Slots</h4>
                          {availabilityForm.availability.length > 0 ? (
                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                              {availabilityForm.availability.map((slot, idx) => (
                                <div key={idx} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                  <div className="font-bold text-indigo-600 mb-1">{slot.date}</div>
                                  <div className="text-sm text-gray-600">{slot.times.join(", ")}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No availability slots configured.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingAvailability(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm font-medium whitespace-nowrap flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Update Availability
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Locations */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-semibold text-gray-700">Locations</label>
                        <button onClick={handleAddLocation} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Add Location</button>
                      </div>
                      {availabilityForm.location.map((loc, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={loc}
                            onChange={(e) => handleLocationChange(idx, e.target.value)}
                            className="flex-1 border rounded px-3 py-2"
                            placeholder="Enter location"
                          />
                          <button onClick={() => handleRemoveLocation(idx)} className="text-red-600 px-2 hover:bg-red-50 rounded">×</button>
                        </div>
                      ))}
                    </div>

                    {/* Availability */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-semibold text-gray-700">Availability Slots</label>
                        <button onClick={handleAddAvailability} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Add Slot</button>
                      </div>
                      {availabilityForm.availability.map((slot, idx) => (
                        <div key={idx} className="border border-gray-200 rounded p-3 mb-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="text-xs font-bold text-gray-500 uppercase">Slot {idx + 1}</h5>
                            <button onClick={() => handleRemoveAvailability(idx)} className="text-red-600 text-xs hover:underline">Remove</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                              <input
                                type="date"
                                value={slot.date}
                                onChange={(e) => handleAvailabilityChange(idx, "date", e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Times (comma separated)</label>
                              <input
                                type="text"
                                value={slot.times.join(", ")}
                                onChange={(e) => handleAvailabilityChange(idx, "times", e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                placeholder="09:00, 10:00"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Booking Type</label>
                              <select
                                value={slot.booking_type || "online"}
                                onChange={(e) => handleAvailabilityChange(idx, "booking_type", e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                              >
                                <option value="online">Online</option>
                                <option value="in-office">In Office</option>
                                <option value="both">Both</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              {(slot.booking_type === "online" || slot.booking_type === "both" || !slot.booking_type) && (
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Online Fee</label>
                                  <input
                                    type="text"
                                    value={slot.consultation_fee_online || ""}
                                    onChange={(e) => handleAvailabilityChange(idx, "consultation_fee_online", e.target.value)}
                                    className="w-full border rounded px-2 py-1.5 text-sm"
                                    placeholder="Fee"
                                  />
                                </div>
                              )}
                              {(slot.booking_type === "in-office" || slot.booking_type === "both") && (
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Office Fee</label>
                                  <input
                                    type="text"
                                    value={slot.consultation_fee_offline || ""}
                                    onChange={(e) => handleAvailabilityChange(idx, "consultation_fee_offline", e.target.value)}
                                    className="w-full border rounded px-2 py-1.5 text-sm"
                                    placeholder="Fee"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        onClick={() => setIsEditingAvailability(false)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                        disabled={isSavingAvailability}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveAvailability}
                        disabled={isSavingAvailability}
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 transition flex items-center gap-2"
                      >
                        {isSavingAvailability ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showLogoutConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/10">
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
                  <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-red-400"
                    >
                      {isLoggingOut ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Logging out...
                        </>
                      ) : "Logout"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}