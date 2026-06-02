"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { toast, Toaster } from "react-hot-toast";
import { updateBookingStatus } from "./actions"

type DoctorApplication = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  image?: string | null;
  views?: number;
  work_schedule?: any;
};

type Availability = {
  date: string;
  times: string[];
  booking_type?: "online" | "in-office" | "both";
  consultation_fee_online?: string;
  consultation_fee_offline?: string;
};

type WorkSchedule = {
  _ui_id?: string;
  day: string;
  start_time: string;
  end_time: string;
  break_start_time?: string;
  break_end_time?: string;
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

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function sortSchedule(schedule: WorkSchedule[]) {
  return [...schedule].sort((a, b) => {
    const diff = DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day);
    if (diff !== 0) return diff;
    return a.start_time.localeCompare(b.start_time);
  });
}

export default function DashboardClient({ app }: DashboardClientProps) {
  const [showStatus, setShowStatus] = useState(false);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDeleteLocationConfirm, setShowDeleteLocationConfirm] = useState(false);
  const [locationToDeleteIndex, setLocationToDeleteIndex] = useState<number | null>(null);
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
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  const [availabilityForm, setAvailabilityForm] = useState({
    availability: [] as Availability[],
    booking_type: "online",
    consultation_fee_online: "",
    consultation_fee_offline: "",
  });
  const [Locations, setLocations] = useState<{ type: string; city: string; address: string; phone: string; latitude: string; longitude: string }[]>([]);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  const [scheduleForm, setScheduleForm] = useState<WorkSchedule[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const endInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const breakEndInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalPatients: 0,
    todayBookings: 0,
    totalRevenue: 0,
    completedBookings: 0,
    totalViews: 0,
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [revenueChartData, setRevenueChartData] = useState<{ date: string; revenue: number }[]>([]);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    bookingId: string | null;
    action: "confirmed" | "cancelled" | null;
  }>({ isOpen: false, bookingId: null, action: null });

  const statusColorMap = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-red-500",
  };

  const updatePendingBookingsCount = async () => {
    if (!app.id) return;
    const { count, error } = await supabase
      .from("bookings")
      .select("*", { count: 'exact', head: true })
      .eq("doctor_id", app.id)
      .eq("status", "pending");

    if (!error && count !== null) {
      setPendingBookingsCount(count);
    }
  };

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/doctor-images/${path}`;
  };

  useEffect(() => {
    updatePendingBookingsCount();

    const channel = supabase
      .channel('doctor-bookings-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `doctor_id=eq.${app.id}` },
        () => {
          updatePendingBookingsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [app.id]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem('justLoggedIn')) {
      toast.success('Logged In');
      window.sessionStorage.removeItem('justLoggedIn');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (activeTab === "availability" && app.id && app.status === "approved") {
        setIsAvailabilityLoading(true);
        fetch(`/api/doctor-applications/${app.id}`)
          .then(async (res) => {
            if (!res.ok) {
              toast.error("Failed to load availability data");
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!data) return;
            let parsedLocations: any[] = [];
            try {
              if (data.location) {
                parsedLocations = typeof data.location === "string" ? JSON.parse(data.location) : data.location;
                // Handle legacy string array if necessary
                if (Array.isArray(parsedLocations) && typeof parsedLocations[0] === 'string') {
                   parsedLocations = parsedLocations.map(l => ({ type: "Main Location", city: "", address: l, phone: "", latitude: "", longitude: "" }));
                }
              }
            } catch { parsedLocations = []; }
            setLocations(parsedLocations);
            setAvailabilityForm({
              availability: data.availability || [],
              booking_type: data.booking_type || "online",
              consultation_fee_online: data.consultation_fee_online || "",
              consultation_fee_offline: data.consultation_fee_offline || "",
            });
          })
          .catch((err) => console.error("Failed to load availability", err))
          .finally(() => setIsAvailabilityLoading(false));
      }

      if ((activeTab === "profile" || activeTab === "settings") && app.id) {
        setIsProfileLoading(true);
        fetch(`/api/doctor-applications/${app.id}`)
          .then(async (res) => {
            if (!res.ok) {
              toast.error("Failed to load profile data");
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!data) return;
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
            });
          })
          .catch((err) => console.error("Failed to load profile", err))
          .finally(() => setIsProfileLoading(false));
      }

      if (activeTab === "bookings" && app.id) {
        setIsBookingsLoading(true);

        const { data, error } = await supabase
          .from("bookings")
          .select('*, users(*)')
          .eq("doctor_id", app.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to load bookings:", error);
        } else {
          const mappedBookings = (data || []).map((b: any) => {
            const user = Array.isArray(b.users) ? b.users[0] : b.users;

            return {
              id: b.id,
              patient_name:
                b.patient_name ||
                user?.fullname ||
                user?.name ||
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
        const loadDashboardData = async () => {
          try {
            const [bookingsResult, doctorRes] = await Promise.all([
              supabase
                .from('bookings')
                .select('*, users(*)')
                .eq('doctor_id', app.id)
                .order("created_at", { ascending: false }),
              fetch(`/api/doctor-applications/${app.id}`)
            ]);

            const { data: bookingsData, error: bookingsError } = bookingsResult;
            if (bookingsError) {
              toast.error("Failed to load bookings");
              return;
            }

            if (!doctorRes.ok) {
              toast.error("Failed to load doctor data");
              return;
            }
            const doctorData = await doctorRes.json();

            const bookingsList = (bookingsData || []).map((b: any) => {
              const user = Array.isArray(b.users) ? b.users[0] : b.users;
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

            const uniquePatients = new Set(bookingsList.map((b: Booking) => b.patient_name)).size;

            // Use local date to ensure "today" matches the user's timezone
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const pendingBookingsCount = bookingsList.filter((b: Booking) => b.status === 'pending').length;
            const completed = bookingsList.filter((b: Booking) => b.status === "completed").length;

            let revenue = 0;
            const onlineFee = parseFloat(((doctorData || {}).consultation_fee_online || "0").toString().replace(/[^0-9.]/g, "")) || 0;
            const offlineFee = parseFloat(((doctorData || {}).consultation_fee_offline || "0").toString().replace(/[^0-9.]/g, "")) || 0;
            const revenueMap: Record<string, number> = {};

            bookingsList.forEach((b: Booking) => {
              if (b.payment_status === "paid") {
                // Use the actual booking amount if available, otherwise fallback to current fee
                const fee = b.amount ? Number(b.amount) : (b.type === "online" ? onlineFee : offlineFee);
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
              todayBookings: pendingBookingsCount,
              totalRevenue: revenue,
              completedBookings: completed,
              totalViews: doctorData.views || 0,
            });
          } catch (err) {
            console.error("Failed to load dashboard stats", err);
          } finally {
            setIsDashboardLoading(false);
          }
        };
        loadDashboardData();
      }

      if (activeTab === "schedule" && app.id) {
        setIsScheduleLoading(true);
        fetch(`/api/doctor-applications/${app.id}`)
          .then(async (res) => {
            if (!res.ok) {
              toast.error("Failed to load schedule");
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!data) return;
            let schedule = [];
            try {
              schedule = typeof data.work_schedule === 'string' ? JSON.parse(data.work_schedule) : data.work_schedule || [];
            } catch (e) { schedule = []; }
            // Add unique IDs for UI stability and focus management
            setScheduleForm(sortSchedule(schedule.map((s: any) => ({ 
              ...s, 
              _ui_id: s._ui_id || Math.random().toString(36).substr(2, 9),
              break_start_time: s.break_start_time || "",
              break_end_time: s.break_end_time || ""
            }))));
          })
          .catch(console.error)
          .finally(() => setIsScheduleLoading(false));
      }
    };
    loadData();
  }, [activeTab, app.id, app.status, refreshKey]);

  // Helper functions for the availability form
  function addLocation() { setLocations([...Locations, { type: "Main Location", city: "", address: "", phone: "", latitude: "", longitude: "" }]); }
  
  function removeLocation(index: number) {
    setLocationToDeleteIndex(index);
    setShowDeleteLocationConfirm(true);
  }

  function confirmDeleteLocation() {
    if (locationToDeleteIndex !== null) {
      setLocations(Locations.filter((_, i) => i !== locationToDeleteIndex));
      setShowDeleteLocationConfirm(false);
      setLocationToDeleteIndex(null);
      toast.success("Location removed");
    }
  }

  function updateLocation(index: number, field: string, value: string) {
    const list = [...Locations];
    const updatedItem = { ...list[index] };
    if (field === "city" || field === "address") {
      (updatedItem as any)[field] = value.toUpperCase();
    } else {
      (updatedItem as any)[field] = value;
    }
    list[index] = updatedItem;
    setLocations(list);
  }

  function handleUseCurrentLocation(index: number) {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const list = [...Locations];
      list[index] = {
        ...list[index],
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6)
      };
      setLocations(list);
    }, (err) => toast.error("Could not retrieve location: " + err.message));
  }

  async function handlePasteCoordinates(index: number) {
    try {
      const text = await navigator.clipboard.readText();
      const matches = text.match(/-?\d+(\.\d+)?/g);
      if (matches && matches.length >= 2) {
        const list = [...Locations];
        list[index] = {
          ...list[index],
          latitude: matches[0],
          longitude: matches[1]
        };
        setLocations(list);
      } else {
        toast.error("Could not find valid coordinates (e.g., '-1.95, 30.06') in clipboard.");
      }
    } catch (err) {
      toast.error("Failed to read clipboard.");
    }
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

  function handleApplyToAllDays() {
    const template = scheduleForm.length > 0 ? scheduleForm[0] : { start_time: "09:00", end_time: "17:00", break_start_time: "", break_end_time: "" };
    
    if (scheduleForm.length > 0 && !window.confirm(`Apply ${template.start_time} - ${template.end_time} to all days of the week? This will overwrite existing entries.`)) {
      return;
    }

    const newSchedule = DAYS_ORDER.map((day) => ({
      _ui_id: Math.random().toString(36).substr(2, 9),
      day,
      start_time: template.start_time,
      end_time: template.end_time,
      break_start_time: template.break_start_time || "",
      break_end_time: template.break_end_time || "",
    }));
    
    setScheduleForm(newSchedule);
    toast.success("Schedule applied to all days");
  }

  function handleAddScheduleRow() {
    const existingDays = scheduleForm.map((item) => item.day);
    const nextAvailableDay = DAYS_ORDER.find((day) => !existingDays.includes(day));

    if (!nextAvailableDay) {
      toast.error("All days of the week are already added.");
      return;
    }

    const newSchedule = [...scheduleForm, { 
      _ui_id: Math.random().toString(36).substr(2, 9), 
      day: nextAvailableDay, 
      start_time: "09:00", 
      end_time: "17:00",
      break_start_time: "",
      break_end_time: ""
    }];
    setScheduleForm(sortSchedule(newSchedule));
  }

  function handleRemoveScheduleRow(index: number) {
    setScheduleForm(scheduleForm.filter((_, i) => i !== index));
  }

  function handleScheduleChange(index: number, field: keyof WorkSchedule, value: string) {
    if (field === "day" && scheduleForm.some((item, i) => i !== index && item.day === value)) {
      toast.error(`${value} is already in the schedule.`);
      return;
    }
    const updated = [...scheduleForm];
    updated[index] = { ...updated[index], [field]: value };
    
    const sorted = sortSchedule(updated);
    setScheduleForm(sorted);
  }

  async function handleSaveSchedule() {
    for (const item of scheduleForm) {
      if (item.start_time >= item.end_time) {
        toast.error(`Invalid hours for ${item.day}: End time must be after start time.`);
        return;
      }
      if (item.break_start_time && item.break_end_time) {
        if (item.break_start_time < item.start_time || item.break_end_time > item.end_time) {
          toast.error(`Invalid break for ${item.day}: Break must be within working hours (${item.start_time} - ${item.end_time}).`);
          return;
        }
        if (item.break_start_time >= item.break_end_time) {
          toast.error(`Invalid break for ${item.day}: Break end time must be after break start time.`);
          return;
        }
      } else if (item.break_start_time || item.break_end_time) {
        toast.error(`Invalid break for ${item.day}: Both break start and end times are required.`);
        return;
      }
    }

    setIsSavingSchedule(true);
    try {
      const scheduleToSave = scheduleForm.map(({ _ui_id, ...rest }) => rest);
      const res = await fetch(`/api/doctor-applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_schedule: JSON.stringify(scheduleToSave) }),
      });
      if (!res.ok) {
        toast.error("Failed to update schedule");
        return;
      }
      toast.success("Schedule updated successfully!");
      setIsEditingSchedule(false);
    } catch (e) {
      console.error(e);
      toast.error("Error updating schedule");
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleSaveAvailability() {
    setIsSavingAvailability(true);
    try {
      const payload = {
        ...availabilityForm,
        location: JSON.stringify(Locations),
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
        toast.error(errorData.error || errorData.message || "Failed to update");
        return;
      }
      toast.success("Availability updated successfully!");
      setIsEditingAvailability(false);
    } catch (e: any) {
      console.error(e);
      toast.error(`Error updating availability: ${e.message || "Unknown error"}`);
    } finally {
      setIsSavingAvailability(false);
    }
  }

  function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    setProfileForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true);

    try {
      const formData = new FormData();
      formData.append("name", profileForm.name);
      formData.append("email", profileForm.email);
      formData.append("specialty", profileForm.specialty);
      formData.append("bio", profileForm.bio);
      formData.append("whatsapp_number", profileForm.whatsapp_number);
      formData.append("country", profileForm.country);
      formData.append("originCountry", profileForm.origin_country);
      formData.append("payment_id", profileForm.payment_id);
      
      if (profileImageFile) {
        formData.append("image", profileImageFile);
      } else if (profileForm.image && !profileForm.image.startsWith("blob:")) {
        formData.append("image", profileForm.image);
      }

      const res = await fetch(`/api/doctor-applications/${app.id}`, {
        method: "PUT",
        body: formData,
      });
      if (!res.ok) {
        toast.error("Failed to update profile");
        return;
      }
      toast.success("Profile updated successfully!");
      router.refresh();
      setIsEditingProfile(false);
    } catch (e) {
      console.error(e);
      toast.error("Error updating profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordUpdate() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (!passwordForm.oldPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch(`/api/doctor/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: app.id,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update password");
        return;
      }
      toast.success("Password updated successfully");
      setIsEditingPassword(false);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error updating password");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function performBookingUpdate(bookingId: string, newStatus: "confirmed" | "cancelled" | "completed") {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    setUpdatingBookingId(bookingId);

    try {
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
              toast.error(`Refund failed: ${refundError.message}`);
              return;
            } else {
              console.log("Refund successful.");
            }
          } else {
            console.warn("User not found for this refund.");
            toast.error("Refund failed: User wallet not found.");
            return;
          }
        } else {
          console.warn("Cannot refund: Missing user_id or amount is 0/undefined.", { user_id: booking.user_id, amount: booking.amount });
          toast.error("Refund failed: Missing booking details.");
          return;
        }
      }

      const { error } = await updateBookingStatus(bookingId, updates);

      if (error) {
        console.error("Failed to update booking status", error);
        toast.error(`Failed to update status: ${error || "Unknown error"}`);
      } else {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)));
        updatePendingBookingsCount();
        if (newStatus === "cancelled" && updates.payment_status === "refunded" && booking.payment_status === "paid") {
          toast.success("Booking cancelled and payment has been refunded.");
        }
      }
    } catch (err) {
      console.error("Unexpected error in performBookingUpdate", err);
      toast.error("An unexpected error occurred");
    } finally {
      setUpdatingBookingId(null);
      setConfirmationModal({ isOpen: false, bookingId: null, action: null });
    }
  }

  function handleBookingAction(bookingId: string, action: "confirmed" | "cancelled" | "completed") {
    if (action === "completed") {
      performBookingUpdate(bookingId, action);
    } else {
      setConfirmationModal({ isOpen: true, bookingId, action });
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
    if (tab !== "status" && app.status !== "approved") {
      toast.error("Not yet approved");
      return;
    }

    if (activeTab === tab) {
      setRefreshKey((prev) => prev + 1);
    }

    setActiveTab(tab);
    setLoadingTab(tab);

    setTimeout(() => {
      if (tab === "status") setShowStatus(true);
      if (tab === "availability") setIsEditingAvailability(false);
      if (tab === "profile") setIsEditingProfile(false);
      if (tab === "schedule") {
        setIsEditingAvailability(false);
        setIsEditingSchedule(false);
      }
      if (tab === "settings") {
        setIsEditingAvailability(false);
        setIsEditingProfile(false);
        setIsEditingSchedule(false);
      }
      setLoadingTab("");
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-white shadow-lg p-4 md:p-6 flex flex-col space-y-4 border-r border-gray-200 overflow-y-auto transition-all duration-300">
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="h-10 w-10 md:h-20 md:w-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shadow-sm mb-3 overflow-hidden transition-all duration-300">
            {app.image ? (
              <img 
                src={getImageUrl(app.image)} 
                alt={app.name} 
                className="h-full w-full object-cover" 
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.name || 'User')}&background=random`; }}
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="text-sm text-gray-500 font-medium break-all text-center px-2 hidden md:block transition-opacity duration-300">{app.email}</div>
        </div>
        <div className="relative">
          <button
            onClick={() => handleNavClick("dashboard")}
            disabled={loadingTab === "dashboard"}
            className={`relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition disabled:bg-blue-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${activeTab === 'dashboard' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            {loadingTab === "dashboard" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden md:block">Dashboard</span>
              </>
            )}
          </button>
          {activeTab === "dashboard" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("availability")}
            disabled={loadingTab === "availability"}
            className={`relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition disabled:bg-orange-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${activeTab === 'availability' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            {loadingTab === "availability" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:block">Availability</span>
              </>
            )}
          </button>
          {activeTab === "availability" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-orange-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("schedule")}
            disabled={loadingTab === "schedule"}
            className={`relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition disabled:bg-teal-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${activeTab === 'schedule' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            {loadingTab === "schedule" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:block">Days and Hours</span>
              </>
            )}
          </button>
          {activeTab === "schedule" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-teal-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("bookings")}
            disabled={loadingTab === "bookings"}
            className={`relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition disabled:bg-green-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${activeTab === 'bookings' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            {loadingTab === "bookings" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:block">Bookings</span>
                {pendingBookingsCount > 0 && (
                  <span className="absolute -top-1 -right-1 md:top-1/2 md:-translate-y-1/2 md:right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                    {pendingBookingsCount}
                  </span>
                )}
              </>
            )}
          </button>
          {activeTab === "bookings" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-green-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("profile")}
            disabled={loadingTab === "profile"}
            className={`relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:bg-indigo-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${activeTab === 'profile' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            {loadingTab === "profile" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden md:block">My profile</span>
              </>
            )}
          </button>
          {activeTab === "profile" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("settings")}
            disabled={loadingTab === "settings"}
            className={`relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-gray-600 text-white rounded-2xl hover:bg-gray-700 transition disabled:bg-gray-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${activeTab === 'settings' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            {loadingTab === "settings" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:block">Settings</span>
              </>
            )}
          </button>
          {activeTab === "settings" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-gray-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("status")}
            className={`relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 disabled:bg-purple-400 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${activeTab === 'status' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
            disabled={loadingTab === "status"}
          >
            {loadingTab === "status" ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:block">Status</span>
              </>
            )}
          </button>
          {activeTab === "status" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-purple-600 rounded-full"></div>}
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden md:block">Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-8 py-5">
          <h2 className="text-center text-xl font-semibold text-gray-800">
          Greetings and welcome dear {app.name} on Dr. Gahungu Platform.
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">

            {activeTab === "dashboard" && (
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">Dashboard Overview</h3>
                {isDashboardLoading ? (
                  <div className="text-center py-10">Loading stats...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">Total Patients</h4>
                      <div className="text-lg font-bold text-center text-gray-800">{dashboardStats.totalPatients}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">Pending Bookings</h4>
                      <div className="text-lg font-bold text-center text-blue-600">{dashboardStats.todayBookings}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">Total Revenue</h4>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="text-lg font-bold text-center text-green-600">{dashboardStats.totalRevenue.toLocaleString()} BIF</div>
                        <button
                          onClick={() => toast.success("The team is implementing it for soon")}
                          disabled={dashboardStats.totalRevenue === 0}
                          className="px-2 py-0.5 text-[10px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          Withdraw
                        </button>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">Completed Bookings</h4>
                      <div className="text-lg font-bold text-center text-purple-600">{dashboardStats.completedBookings}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">Profile Views</h4>
                      <div className="text-lg font-bold text-center text-indigo-600">{dashboardStats.totalViews}</div>
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
                        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
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
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">My Profile</h3>
                {isProfileLoading ? (
                  <div className="text-center py-10">Loading profile...</div>
                ) : !isEditingProfile ? (
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="flex-1 w-full bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <div className="flex flex-col items-center md:flex-row md:items-center gap-4 md:gap-6 mb-8">
                        <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm overflow-hidden border border-gray-200 shrink-0">
                          {profileForm.image ? (
                            <img 
                              src={getImageUrl(profileForm.image)} 
                              alt="Profile" 
                              className="h-full w-full object-cover" 
                              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.name || 'User')}&background=random`; }}
                            />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden w-full text-center md:text-left">
                      <h4 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{profileForm.name}</h4>
                      <p className="text-indigo-600 font-medium truncate">{profileForm.specialty}</p>
                      <p className="text-gray-500 text-sm mt-1 truncate">{profileForm.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-center">
                        <div className="flex flex-col items-center">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">WhatsApp</h5>
                          <p className="text-gray-900 font-medium">{profileForm.whatsapp_number || "Not set"}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment ID</h5>
                          <p className="text-gray-900 font-medium">{profileForm.payment_id || "Not set"}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Country</h5>
                          <p className="text-gray-900 font-medium">{profileForm.country || "Not set"}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Origin Country</h5>
                          <p className="text-gray-900 font-medium">{profileForm.origin_country || "Not set"}</p>
                        </div>
                      </div>

                      <div className="text-center">
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bio</h5>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 text-gray-700 whitespace-pre-wrap text-center">
                          {profileForm.bio || "No bio provided."}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm font-medium whitespace-nowrap flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
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
                          <img 
                            src={getImageUrl(profileForm.image)} 
                            alt="Profile" 
                            className="h-full w-full object-cover" 
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.name || 'User')}&background=random`; }}
                          />
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

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                        disabled={isSavingProfile}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
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

            {activeTab === "settings" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">Settings</h3>
                {isProfileLoading ? (
                  <div className="text-center py-10">Loading settings...</div>
                ) : (
                  <div className="max-w-2xl">
                    <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                      <div className="text-lg font-bold text-gray-900">{profileForm.name}</div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="font-bold text-gray-800 mb-4">Security</h4>
                      {!isEditingPassword ? (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                            <div className="text-lg font-bold text-gray-900">••••••••</div>
                          </div>
                          <button
                            onClick={() => setIsEditingPassword(true)}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            Update Password
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                          <div>
                            <label className="block font-semibold text-gray-700 mb-1">Current Password</label>
                            <div className="relative">
                              <input
                                type={showOldPassword ? "text" : "password"}
                                value={passwordForm.oldPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-10"
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                              >
                                {showOldPassword ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block font-semibold text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-10"
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                              >
                                {showNewPassword ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block font-semibold text-gray-700 mb-1">Confirm New Password</label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-10"
                                placeholder="Confirm new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                              >
                                {showConfirmPassword ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="pt-2 flex gap-3">
                            <button
                              onClick={() => {
                                setIsEditingPassword(false);
                                setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
                              }}
                              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                              disabled={isSavingPassword}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handlePasswordUpdate}
                              disabled={isSavingPassword || !passwordForm.newPassword || !passwordForm.oldPassword}
                              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                            >
                              {isSavingPassword ? "Updating..." : "Save Password"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">My Bookings</h3>
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
                                  onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                  disabled={updatingBookingId === booking.id}
                                  className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 bg-green-50 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                  {updatingBookingId === booking.id && (
                                    <svg className="animate-spin h-3 w-3 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  )}
                                  Confirm
                                </button>
                              )}
                              {booking.status === 'confirmed' && (
                                <button
                                  onClick={() => handleBookingAction(booking.id, 'completed')}
                                  disabled={updatingBookingId === booking.id}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 bg-blue-50 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                  {updatingBookingId === booking.id && (
                                    <svg className="animate-spin h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  )}
                                  Complete
                                </button>
                              )}
                              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                <button
                                  onClick={() => handleBookingAction(booking.id, 'cancelled')}
                                  disabled={updatingBookingId === booking.id}
                                  className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 bg-red-50 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                  {updatingBookingId === booking.id && (
                                    <svg className="animate-spin h-3 w-3 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  )}
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
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">Manage Availability & Fees</h3>

                {app.status !== "approved" ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-center">
                    You can only manage your availability and fees once your application has been approved.
                  </div>
                ) : isAvailabilityLoading ? (
                  <div className="text-center py-10">Loading details...</div>
                ) : !isEditingAvailability ? (
                  <div className="flex flex-col gap-6 items-center">
                    <div className="flex-1 w-full">
                      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6 text-center">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">Locations</h4>
                          {Locations.length > 0 ? (
                            <div className="space-y-3">
                              {Locations.map((loc, i) => (
                                <div key={i} className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-100 text-center">
                                  <p className="font-bold text-gray-800">{loc.type} - {loc.city}</p>
                                  <p>{loc.address}</p>
                                  {loc.phone && <p>📞 {loc.phone}</p>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No locations added.</p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">Availability Slots</h4>
                          {availabilityForm.availability.length > 0 ? (
                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                              {availabilityForm.availability.map((slot, idx) => (
                                <div key={idx} className="bg-white p-3 rounded border border-gray-200 shadow-sm text-center">
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
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm font-medium whitespace-nowrap flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
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
                        <label className="block font-semibold text-gray-700">Locations</label>
                        <button onClick={addLocation} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">+ Add Location</button>
                      </div>
                      <div className="space-y-4">
                        {Locations.map((loc, index) => (
                          <div key={index} className="relative">
                            <button onClick={() => removeLocation(index)} className="absolute -top-2 -right-2 z-10 p-1 bg-white text-gray-400 hover:text-red-500 rounded-full border border-gray-200 shadow-sm transition-colors cursor-pointer">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <select
                                value={loc.type}
                                onChange={(e) => updateLocation(index, "type", e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                              >
                                <option value="Main Location">Main Location</option>
                                <option value="Branch Location">Branch Location</option>
                              </select>
                              <input
                                type="text"
                                value={loc.city}
                                onChange={(e) => updateLocation(index, "city", e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                                placeholder="City"
                              />
                            </div>
                            <div className="mb-3">
                              <input
                                type="text"
                                value={loc.address}
                                onChange={(e) => updateLocation(index, "address", e.target.value)}
                                className="w-full border rounded px-3 py-2 text-sm"
                                placeholder="Address / Street"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <input
                                type="text"
                                value={loc.latitude}
                                onChange={(e) => updateLocation(index, "latitude", e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                                placeholder="Latitude (e.g. -3.38)"
                              />
                              <input
                                type="text"
                                value={loc.longitude}
                                onChange={(e) => updateLocation(index, "longitude", e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                                placeholder="Longitude (e.g. 29.36)"
                              />
                              <input
                                type="text"
                                value={loc.phone}
                                onChange={(e) => updateLocation(index, "phone", e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                                placeholder="Phone (Optional)"
                              />
                            </div>
                            <div className="mt-2 flex justify-end gap-3 items-center">
                              <button
                                onClick={() => {
                                  const query = `${loc.address} ${loc.city}`.trim();
                                  if (!query) return alert("Please enter an address or city to search.");
                                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                                }}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Find on Map
                              </button>
                              <button
                                onClick={() => handlePasteCoordinates(index)}
                                className="text-xs flex items-center gap-1 text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Paste Coordinates
                              </button>
                              <button
                                onClick={() => handleUseCurrentLocation(index)}
                                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Use Current Location
                              </button>
                            </div>
                            {loc.latitude && loc.longitude && !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude)) && (
                              <div className="mt-3 h-48 w-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                                <iframe
                                  width="100%"
                                  height="100%"
                                  style={{ border: 0 }}
                                  loading="lazy"
                                  src={`https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=15&output=embed`}
                                ></iframe>
                              </div>
                            )}
                            </div>
                          </div>
                        ))}
                        {Locations.length === 0 && <div className="text-sm text-gray-500 italic">No locations added.</div>}
                      </div>
                    </div>

                    {/* Availability */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-semibold text-gray-700">Availability Slots</label>
                        <button onClick={handleAddAvailability} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Add Slot</button>
                      </div>
                      {availabilityForm.availability.map((slot, idx) => (
                        <div key={idx} className="border border-gray-200 rounded p-3 mb-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="text-xs font-bold text-gray-500 uppercase">Slot {idx + 1}</h5>
                            <button onClick={() => handleRemoveAvailability(idx)} className="text-red-600 text-xs hover:underline cursor-pointer">Remove</button>
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
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                        disabled={isSavingAvailability}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveAvailability}
                        disabled={isSavingAvailability}
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 transition flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
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

            {activeTab === "schedule" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">Manage Working Days & Hours</h3>
                {isScheduleLoading ? (
                  <div className="text-center py-10">Loading schedule...</div>
                ) : !isEditingSchedule ? (
                  <div className="space-y-6">
                    {scheduleForm.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500 mb-6">You haven't set up your working schedule yet.</p>
                        <button
                          onClick={() => setIsEditingSchedule(true)}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          Create Schedule
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {scheduleForm.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-lg text-gray-800">{item.day}</h4>
                                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span className="text-gray-500">Hours</span>
                                  <span className="font-medium text-gray-900">{item.start_time} - {item.end_time}</span>
                                </div>
                                {(item.break_start_time && item.break_end_time) ? (
                                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded text-orange-700">
                                    <span className="opacity-75">Break</span>
                                    <span className="font-medium">{item.break_start_time} - {item.break_end_time}</span>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-gray-400">
                                    <span>Break</span>
                                    <span>None</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                          <button
                            onClick={() => setIsEditingSchedule(true)}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Edit Schedule
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-gray-700">Weekly Schedule</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={handleApplyToAllDays}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          Apply to All Days
                        </button>
                        <button onClick={handleAddScheduleRow} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">+ Add Day</button>
                      </div>
                    </div>

                    {scheduleForm.length === 0 ? (
                      <p className="text-gray-500 italic text-center py-4">No working days added yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {scheduleForm.map((item, idx) => (
                          <div key={item._ui_id || idx} className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-gray-50 p-3 rounded border border-gray-200">
                            <div className="w-full md:w-32 shrink-0">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
                              <select
                                value={item.day}
                                onChange={(e) => handleScheduleChange(idx, "day", e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                              >
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-full md:flex-1">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                              <input
                                type="time"
                                value={item.start_time}
                                onChange={(e) => handleScheduleChange(idx, "start_time", e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && item._ui_id) {
                                    e.preventDefault();
                                    endInputRefs.current.get(item._ui_id)?.focus();
                                  }
                                }}
                              />
                            </div>
                            <div className="w-full md:flex-1">
                              <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                              <input
                                type="time"
                                value={item.end_time}
                                onChange={(e) => handleScheduleChange(idx, "end_time", e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                ref={(el) => {
                                  if (el && item._ui_id) endInputRefs.current.set(item._ui_id, el);
                                  else if (item._ui_id) endInputRefs.current.delete(item._ui_id);
                                }}
                              />
                            </div>
                            <div className="w-full md:flex-1">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Break Start</label>
                              <input
                                type="time"
                                value={item.break_start_time || ""}
                                onChange={(e) => handleScheduleChange(idx, "break_start_time", e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && item._ui_id) {
                                    e.preventDefault();
                                    breakEndInputRefs.current.get(item._ui_id)?.focus();
                                  }
                                }}
                              />
                            </div>
                            <div className="w-full md:flex-1">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Break End</label>
                              <input
                                type="time"
                                value={item.break_end_time || ""}
                                onChange={(e) => handleScheduleChange(idx, "break_end_time", e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm"
                                ref={(el) => {
                                  if (el && item._ui_id) breakEndInputRefs.current.set(item._ui_id, el);
                                  else if (item._ui_id) breakEndInputRefs.current.delete(item._ui_id);
                                }}
                              />
                            </div>
                            <button onClick={() => handleRemoveScheduleRow(idx)} className="text-red-600 p-2 hover:bg-red-50 rounded cursor-pointer">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 flex gap-3">
                      <button
                        onClick={() => setIsEditingSchedule(false)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                        disabled={isSavingSchedule}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSchedule}
                        disabled={isSavingSchedule}
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 transition flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        {isSavingSchedule ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : "Save Schedule"}
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
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-red-400 cursor-pointer"
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

            {confirmationModal.isOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/10">
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {confirmationModal.action === "confirmed" ? "Confirm Booking" : "Cancel Booking"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {confirmationModal.action === "confirmed"
                      ? "Are you sure you want to confirm this booking?"
                      : "Are you sure you want to cancel this booking? This action cannot be undone."}
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setConfirmationModal({ isOpen: false, bookingId: null, action: null })}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                      disabled={!!updatingBookingId}
                    >
                      No, Go Back
                    </button>
                    <button
                      onClick={() => {
                        if (confirmationModal.bookingId && confirmationModal.action) {
                          performBookingUpdate(confirmationModal.bookingId, confirmationModal.action);
                        }
                      }}
                      disabled={!!updatingBookingId}
                      className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${
                        confirmationModal.action === "confirmed" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {updatingBookingId ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : "Yes, Proceed"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDeleteLocationConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/10">
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Deletion</h3>
                  <p className="text-gray-600 mb-6">Are you sure you want to delete this location?</p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeleteLocationConfirm(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteLocation}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      Delete
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