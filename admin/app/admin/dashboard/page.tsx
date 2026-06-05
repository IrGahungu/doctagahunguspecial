"use client";

import UsersTable from "@/app/components/UsersTable"
import OrdersTable from "@/app/components/OrdersTable";
import ApplicationsTable from "@/app/components/ApplicationsTable";
import DoctorBookingsTable from "@/app/components/DoctorBookingsTable";
import BusBookingsTable from "@/app/components/BusBookingsTable";
import BusesTable from "@/app/components/BusesTable";
import CategoryModal from "@/app/components/CategoryModal";
import HospitalModal from "@/app/components/HospitalModal";
import PharmacyModal from "@/app/components/PharmacyModal";
import InsuranceModal from "@/app/components/InsuranceModal";
import BannerModal from "@/app/components/BannerModal";
import DealModal from "@/app/components/DealModal";
import DoctorModal from "@/app/components/DoctorModal";
import MedicineModal from "@/app/components/MedicineModal";
import StoryModal from "@/app/components/StoryModal";
import PostModal from "@/app/components/PostModal";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type User = {
  userId: string;
  fullname: string;
  whatsapp_number: string;
  country: string;
  gender: string;
  role: "admin" | "user";
  wallet_balance: string;
  created_at: string;
  secret_question: string;
  secret_answer: string;
  password?: string;
  engagement_points: number;
};

type Category = {
  id: string;
  name: string;
  image?: string;
};

type Location = {
  name: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
};

type Pharmacy = {
  id: string;
  name: string;
  image?: string;
  locations?: Location[];  // <-- array of objects, not string
  accepted_insurances?: string[];
};

type Hospital = {
  id: string;
  name: string;
  image?: string;
  location?: string[];
  specialties?: string[];
  insurances?: string[];
  blood_types?: string[];
};

type Insurance = {
  id: string;
  name: string;
  image?: string;
  locations?: { location: string; plans: any[] }[];
};

type Banner = {
  id: string;
  image: string;
  link: string;
};

type Deal = {
  id: string;
  title: string;
  discount: string;
  image: string;
  tagline: string;
};

type Availability = {
  date: string;
  times: string[];
};

type Doctor = {
  id: string;
  name: string;
  image?: string;
  specialty?: string;
  location?: string[];
  bio?: string;
  booking_type?: "online" | "in-office" | "both";
  availability: Availability[];
};

type Medicine = {
  id: string;
  name: string;
  title: string;
  price: number;
  original_price?: number | null;
  image?: string | null;
  category_id?: string | null;
  description?: string | null;
  pharmacy_id?: string;
  quantity?: number;
  insurances?: string[];
  pharmacies?: any[] | null;
};

type Story = {
  id: string;
  name: string;
  avatar: string;
  images: string[];
  tag: string;
  website?: string;
  show_tag?: boolean;
  show_website?: boolean;
};

type Post = {
  id: string;
  title: string;
  tag?: string;
  avatar: string;
  images: string[];
  caption: string;
  likes: number;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  twitter?: string;
  show_website?: boolean;
  show_whatsapp?: boolean;
  show_instagram?: boolean;
  show_twitter?: boolean;
};

type Review = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
  admin_reply?: string;
  user_id?: string;
};

type LeaderboardEntry = {
  id: string;
  fullname: string;
  whatsapp_number: string;
  country: string;
  engagement_points: number;
};

type ServiceFee = {
  id: string;
  service_type: string;
  country: string;
  fee: number;
};

type ButtonSettings = {
  show_product_cta_button: boolean;
  show_doctor_cta_button: boolean;
  show_hospital_cta_button: boolean;
  show_insurance_cta_button: boolean;
  show_pharmacy_cta_button: boolean;
  show_book_online_button: boolean;
  show_book_in_office_button: boolean;
  show_orders_button: boolean; // New
  show_my_appointments_button: boolean; // New
  show_book_bus_button: boolean; // New
  show_my_bus_tickets_button: boolean; // New
};

const API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || "http://localhost:3001";

type ApprovedEntity = {
  id: string;
  name: string;
  revenue: number;
  image?: string;
};

type OverallStats = {
  doctors: ApprovedEntity[];
  hospitals: ApprovedEntity[];
  insurances: ApprovedEntity[];
  pharmacies: ApprovedEntity[];
  admin: { serviceFees: number; loginFees: number; busFees: number; total: number };
};

type EpRewards = {
  ep_story_view: string;
  ep_post_view: string;
  ep_post_like: string;
  story_duration: string;
  show_add_to_cart_button: boolean;
  monetization_goal: string;
} & ButtonSettings;

const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const DOCTOR_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/doctor-images/";
const HOSPITAL_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/hospital-images/";
const INSURANCE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/insurance-images/";
const PHARMACY_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/pharmacy-images/";
const BANNER_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/banner-images/";
const DEAL_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/deal-images/";

// Initialize Supabase client for realtime subscriptions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [serviceFees, setServiceFees] = useState<ServiceFee[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [statsSearchQuery, setStatsSearchQuery] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [applicationType, setApplicationType] = useState<"doctor" | "pharmacy" | "hospital" | "insurance" | null>(null);
  const [overallStats, setOverallStats] = useState<OverallStats>({
    doctors: [],
    hospitals: [],
    insurances: [],
    pharmacies: [],
    admin: { serviceFees: 0, loginFees: 0, busFees: 0, total: 0 }
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedBannerIds, setSelectedBannerIds] = useState<Set<string>>(new Set());
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; type: 'delete' | 'update' | 'logout' } | null>(null);
  const [epRewards, setEpRewards] = useState({
    ep_story_view: "500",
    ep_post_view: "300",
    ep_post_like: "200",
    story_duration: "45000",
    show_add_to_cart_button: true, // Default to true to match your SQL initialization
    show_product_cta_button: true,
    show_doctor_cta_button: true,
    show_hospital_cta_button: true,
    show_insurance_cta_button: true,
    show_pharmacy_cta_button: true,
    show_book_online_button: true,
    show_book_in_office_button: true,
    show_orders_button: true, // New
    show_my_appointments_button: true, // New
    show_book_bus_button: true, // New
    show_my_bus_tickets_button: true, // New
  } as EpRewards);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [insuranceModalOpen, setInsuranceModalOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(
    null
  );
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [newFee, setNewFee] = useState({ service_type: "bus", country: "Burundi", fee: "" });
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [tempFeeValue, setTempFeeValue] = useState<string>("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statsModal, setStatsModal] = useState<{ isOpen: boolean; title: string; data: any[]; extraInfo?: string }>({ isOpen: false, title: "", data: [] });
  const [minEpThreshold, setMinEpThreshold] = useState<number | null>(null);
  const [newThresholdInput, setNewThresholdInput] = useState("");
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Generic fetcher function
  async function fetchData<T>(
    endpoint: string,
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    transform?: (data: any[]) => T[]
  ) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        console.error(`Failed to fetch ${endpoint}: ${res.statusText}`);
        if (res.status === 401 || res.status === 403) {
          router.push("/admin/login");
        }
        return;
      }
      const result = await res.json();
      const data = result.data || result;
      if (transform) {
        setter(transform(data));
      } else {
        setter(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
    }
  }

  // Helper transformers for consistency between fetch and realtime
  const mapStory = (s: any): Story => ({
    ...s,
    images: typeof s.images === "string" ? JSON.parse(s.images) : s.images,
  });

  const mapPost = (p: any): Post => ({
    ...p,
    images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
  });

  const fetchCategories = () => fetchData("/api/admin/users?type=categories", setCategories);
  const fetchPharmacies = () =>
    fetchData("/api/admin/users?type=pharmacy_applications", setPharmacies, (data) =>
      (Array.isArray(data) ? data : []).map((phar: any) => {
        const parseArrayField = (field: any) => {
          if (Array.isArray(field)) return field;
          if (typeof field === "string") {
            try {
              const parsed = JSON.parse(field);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              return field.replace(/[{}"]/g, "").split(",").map((s: any) => s.trim()).filter(Boolean);
            }
          }
          return [];
        };
        return {
          ...phar,
          locations: parseArrayField(phar.location || phar.locations),
          accepted_insurances: parseArrayField(phar.accepted_insurances)
        };
      })
    );
  const fetchHospitals = () =>
    fetchData("/api/hospitals", setHospitals, (data) =>
      (Array.isArray(data) ? data : []).map((hosp: any) => {
        const parseArrayField = (field: any) => {
          if (Array.isArray(field)) return field;
          if (typeof field === "string") return field.replace(/[{}"]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
          return [];
        };
        return {
          ...hosp,
          location: parseArrayField(hosp.location),
          specialties: parseArrayField(hosp.specialties),
          insurances: parseArrayField(hosp.insurances),
          blood_types: parseArrayField(hosp.blood_types),
        };
      })
    );
  const fetchInsurances = () => fetchData("/api/insurances", setInsurances);
  const fetchBanners = () => fetchData("/api/admin/users?type=banners", setBanners);
  const fetchDeals = () => fetchData("/api/admin/users?type=deals", setDeals);
  const fetchDoctors = () =>
    fetchData("/api/admin/users?type=doctor_applications", setDoctors, (data) =>
      (Array.isArray(data) ? data : []).map((doc: any) => {
        const parseArrayField = (field: any) => {
          if (Array.isArray(field)) return field;
          if (typeof field === 'string') return field.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
          return [];
        };
        return { ...doc, location: parseArrayField(doc.location) };
      })
    );
  const fetchMedicines = () =>
    fetchData("/api/admin/users?type=stock", setMedicines, (data) =>
      (Array.isArray(data) ? data : []).map((item: any) => {
        const parseArray = (val: any) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          try { return JSON.parse(val); } catch (e) { return []; }
        };
        return {
          ...item,
          insurances: parseArray(item.insurances),
        };
      })
    );

  const fetchStories = () =>
    fetchData("/api/admin/users?type=stories", setStories, (data) =>
      (Array.isArray(data) ? data : []).map(mapStory)
    );

  const fetchReviews = () => fetchData("/api/admin/users?type=reviews", setReviews);

  const fetchServiceFees = () => fetchData("/api/admin/service-fees", setServiceFees);

  const fetchEpThreshold = async () => {
    try {
      const res = await fetch("/api/admin/settings/min-ep-required");
      if (res.ok) {
        const data = await res.json();
        setMinEpThreshold(data.min_ep_required);
        setNewThresholdInput(data.min_ep_required.toString());
      } else {
        toast.error("Failed to load EP threshold configuration");
      }
    } catch (e) {
      console.error("Failed to fetch EP threshold", e);
      toast.error("Server error while fetching threshold");
    }
  };

  const fetchEpRewards = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch("/api/admin/settings/engagement-points", {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        const settings = data.data || data;
        
        const isTrue = (val: any) => val === true || val === 'true';

        setEpRewards({
          ep_story_view: (settings.ep_story_view?.toString() ?? "500"),
          ep_post_view: (settings.ep_post_view?.toString() ?? "300"),
          ep_post_like: (settings.ep_post_like?.toString() ?? "200"),
          story_duration: (settings.story_duration?.toString() ?? "45000"),
          show_add_to_cart_button: isTrue(settings.show_add_to_cart_button),
          show_product_cta_button: isTrue(settings.show_call_car_button_product),
          show_doctor_cta_button: isTrue(settings.show_call_car_button_doctor),
          show_hospital_cta_button: isTrue(settings.show_call_car_button_hospital),
          show_insurance_cta_button: isTrue(settings.show_call_car_button_insurance),
          show_pharmacy_cta_button: isTrue(settings.show_call_car_button_pharmacy),
          show_book_online_button: isTrue(settings.show_book_online_button),
          show_book_in_office_button: isTrue(settings.show_book_in_office_button),
          show_orders_button: isTrue(settings.show_orders_button), // New
          show_my_appointments_button: isTrue(settings.show_my_appointments_button), // New
          show_book_bus_button: isTrue(settings.show_book_bus_button), // New
          show_my_bus_tickets_button: isTrue(settings.show_my_bus_tickets_button), // New
          monetization_goal: (settings.monetization_goal?.toString() ?? "50000"),
        });
        console.log("Fetched EP Rewards and Settings:", data);
      }
    } catch (e) {
      console.error("Failed to fetch EP rewards", e);
    }
  };

  const handleUpdateEpReward = async (
    key: string,
    value: boolean | string
  ) => {
    console.log(`[Dashboard] Update requested - Key: ${key}, Value:`, value);

    let endpoint = "/api/admin/settings/engagement-points";
    let body: any = { key, value };

    if (key === "monetization_goal") {
      const parsedVal = parseInt(value as string);
      if (isNaN(parsedVal) || parsedVal < 0) {
        return toast.error("Please enter a valid non-negative number");
      }
    }

    const ctaButtonKeys = [
      "show_product_cta_button",
      "show_doctor_cta_button",
      "show_hospital_cta_button",
      "show_insurance_cta_button",
      "show_pharmacy_cta_button",
      "show_book_online_button",
      "show_book_in_office_button",
      "show_orders_button",
      "show_my_appointments_button",
      "show_book_bus_button",
      "show_my_bus_tickets_button"
    ];

    if (key === "show_add_to_cart_button") {
      endpoint = "/api/admin/settings/toggle-cart-button";
      body = { isVisible: value };
    } else if (ctaButtonKeys.includes(key)) {
      endpoint = "/api/admin/settings/toggle-button";
      body = { key, isVisible: value };
    } else {
      const parsedVal = parseInt(value as string);
      if (isNaN(parsedVal) || parsedVal < 0) {
        return toast.error("Please enter a valid non-negative number");
      }
    }

    setIsRefreshing(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(
          `[Dashboard] Update failed. Status: ${res.status}`
        );
        throw new Error("Update failed");
      }

      console.log(`[Dashboard] Server confirmed update`);

      if (key === "show_add_to_cart_button" || ctaButtonKeys.includes(key)) {
        if (key === "show_add_to_cart_button") {
          toast.success(
            value ? "Add to cart button visible" : "Add to cart button hidden"
          );
        } else {
          toast.success("Visibility updated successfully");
        }

        setEpRewards((prev) => ({
          ...prev,
          [key]: value as boolean, // ✅ Fixed: Updates the specific key clicked
        }));
      } else if (key === "monetization_goal") {
        toast.success("Monetization goal updated!");
        setEpRewards((prev) => ({
          ...prev,
          monetization_goal: String(value),
        }));
      } else if (key === "story_duration") {
        toast.success("Story duration updated");
        setEpRewards((prev) => ({
          ...prev,
          story_duration: String(value),
        }));
      } else {
        toast.success("Engagement point reward updated!");
        setEpRewards((prev) => ({
          ...prev,
          [key]: String(value),
        }));
      }

    } catch (err) {
      toast.error("Error updating reward");
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleToggleButton = async (key: string, value: boolean) => {
    console.log("Sending:", key, value); // add this

    setIsRefreshing(true);

    try {
      const res = await fetch("/api/admin/settings/toggle-button", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          isVisible: value,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      setEpRewards((prev) => ({
        ...prev,
        [key]: value,
      }));

      toast.success("Setting updated");
    } catch {
      toast.error("Error updating setting");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleUpdateSettingValue = async (key: string, inputValue: string) => {
    const val = parseInt(newThresholdInput);
    if (isNaN(val) || val < 0) return toast.error("Please enter a valid non-negative number");

    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/settings/min-ep-required", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: val }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Setting updated successfully!");
      if (key === 'min_ep_required') fetchEpThreshold();
      else fetchEpRewards();
    } catch (err) {
      toast.error("Error updating setting");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchLeaderboard = () => fetchData("/api/admin/leaderboard", setLeaderboard);

  const fetchPosts = () =>
    fetchData("/api/admin/users?type=posts", setPosts, (data) =>
      (Array.isArray(data) ? data : []).map(mapPost)
    );

  const fetchOverallStats = async () => {
    try {
      const res = await fetch("/api/admin/stats/overall");
      if (res.ok) {
        const result = await res.json();
        console.log("DEBUG Frontend: Received Overall Stats:", result);
        setOverallStats(result.data || result);
      }
    } catch (error) {
      console.error("Error fetching overall stats:", error);
    }
  };

  /** ----------------------
   * Navigation & Refresh Logic
   -----------------------*/
  const handleNavClick = async (view: string, type: "doctor" | "pharmacy" | "hospital" | "insurance" | null = null) => {
    setIsRefreshing(true);
    try {
      if (activeView === view && applicationType === type) {
        setRefreshKey((prev) => prev + 1);
      }

      setActiveView(view);
      setSelectedCategoryIds(new Set());
      setSelectedBannerIds(new Set());
      setSelectedDealIds(new Set());
      setSelectedStoryIds(new Set());
      setSelectedPostIds(new Set());
      setApplicationType(type);

      const refreshTasks = [];
      if (view === "stock") refreshTasks.push(fetchMedicines(), fetchPharmacies(), fetchCategories());
      else if (view === "categories") refreshTasks.push(fetchCategories());
      else if (view === "banners") refreshTasks.push(fetchBanners());
      else if (view === "deals") refreshTasks.push(fetchDeals());
      else if (view === "stories") refreshTasks.push(fetchStories());
      else if (view === "posts") refreshTasks.push(fetchPosts());
      else if (view === "reviews") refreshTasks.push(fetchReviews());
      else if (view === "leaderboard") refreshTasks.push(fetchLeaderboard());
      else if (view === "service-fees") refreshTasks.push(fetchServiceFees());
      else if (view === "ep-threshold") refreshTasks.push(fetchEpThreshold());
      else if (view === "engagement-points") refreshTasks.push(fetchEpRewards());
      else if (view === "manage-buttons") refreshTasks.push(fetchEpRewards()); // Fetch all EP settings, including button visibility
      else if (view === "overall-view") refreshTasks.push(fetchOverallStats());
      
      if (refreshTasks.length > 0) {
        await Promise.all(refreshTasks);
      } else {
        // Brief delay for components that manage their own fetching (UsersTable, etc)
        // so the user sees a visual confirmation of the refresh
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  /** ----------------------
   * Fetch current user and all data on mount
   -----------------------*/
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          // If not authenticated, redirect to login
          router.push("/admin/login");
          return;
        }
        const { user: currentUser } = await res.json();
        if (currentUser && currentUser.role === "admin") {
          setUser(currentUser);
          setIsSupabaseConnected(true); // Assuming this is a flag to start other fetches
        } else {
          // If not an admin, redirect
          alert("Access denied. Admin role required.");
          router.push("/admin/login");
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
        router.push("/admin/login");
      }
    }
    getCurrentUser();
  }, [router]);

  useEffect(() => {
    if (isSupabaseConnected) {
      fetchCategories();
      fetchPharmacies();
      fetchHospitals();
      fetchInsurances();
      fetchBanners();
      fetchDeals();
      fetchDoctors();
      fetchMedicines();
      fetchStories();
      fetchReviews();
      fetchPosts();
      fetchLeaderboard();
      fetchServiceFees();
      fetchEpThreshold();
      fetchEpRewards(); // Fetch initial EP rewards and button visibility
      fetchOverallStats();
    }
  }, [isSupabaseConnected]);

  /** ----------------------
   * Realtime Subscriptions
   -----------------------*/
  useEffect(() => {
    if (!isSupabaseConnected) return;

    const storiesChannel = supabase
      .channel("stories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newStory = mapStory(payload.new);
          setStories((prev) => [newStory, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          const updatedStory = mapStory(payload.new);
          setStories((prev) => prev.map((s) => (s.id === updatedStory.id ? updatedStory : s)));
        } else if (payload.eventType === "DELETE") {
          setStories((prev) => prev.filter((s) => s.id !== payload.old.id));
        }
      })
      .subscribe();

    const postsChannel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newPost = mapPost(payload.new);
          setPosts((prev) => [newPost, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          const updatedPost = mapPost(payload.new);
          setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
        } else if (payload.eventType === "DELETE") {
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [isSupabaseConnected]);

  /** ----------------------
   * Modal UX improvements
   -----------------------*/
  function closeAllModals() {
    setCategoryModalOpen(false);
    setPharmacyModalOpen(false);
    setHospitalModalOpen(false);
    setInsuranceModalOpen(false);
    setBannerModalOpen(false);
    setDealModalOpen(false);
    setDoctorModalOpen(false);
    setMedicineModalOpen(false);
    setStoryModalOpen(false);
    setPostModalOpen(false);
    setFeeModalOpen(false);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAllModals();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function executeSignOut() {
    setConfirmModal(null);
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout");
      router.push("/admin/login");
    } catch (error) {
      console.error("Failed to sign out", error);
      setIsSigningOut(false);
      toast.error("Failed to sign out");
    }
  }

  function handleSignOut() {
    setConfirmModal({
      title: "Confirm Sign Out",
      message: "Are you sure you want to sign out? You will be redirected to the login page.",
      type: 'logout',
      onConfirm: executeSignOut
    });
  }

  async function handleCreateServiceFee() {
    if (!newFee.fee || !newFee.country) return toast.error("Please fill all fields");

    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/service-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFee),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create fee");
      }

      toast.success("Service fee created");
      setFeeModalOpen(false);
      setNewFee({ service_type: "bus", country: "Burundi", fee: "" });
      fetchServiceFees();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  /** ----------------------
   * Service Fee CRUD
   -----------------------*/
  async function handleUpdateServiceFee(id: string) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/service-fees?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee: tempFeeValue }),
      });

      if (!res.ok) throw new Error("Failed to update fee");

      toast.success("Service fee updated");
      setEditingFeeId(null);
      fetchServiceFees();
    } catch (err) {
      toast.error("Error updating fee");
    } finally {
      setLoadingId(null);
    }
  }

  /** ----------------------
   * Category CRUD (RLS-compatible)
   -----------------------*/
  function openAddCategoryModal() {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  }

  function openEditCategoryModal(cat: Category) {
    setEditingCategory(cat);
    setCategoryModalOpen(true);
  }

  function handleCategorySaveSuccess() {
    if (editingCategory) {
      toast.success("Category updated");
    } else {
      toast.success("Category added");
    }
    fetchCategories();
    closeAllModals();
  }

  const handleCategoryDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Category",
      message: "Are you sure you want to delete this category? This action cannot be undone.",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Category deleted");
            fetchCategories();
          } else throw new Error();
        } catch (err) {
          toast.error("Failed to delete category");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  const toggleSelectCategory = (id: string) => {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllCategories = () => {
    if (selectedCategoryIds.size === categories.length) {
      setSelectedCategoryIds(new Set());
    } else {
      setSelectedCategoryIds(new Set(categories.map(c => c.id)));
    }
  };

  const handleBulkCategoryDelete = () => {
    if (selectedCategoryIds.size === 0) return;
    setConfirmModal({
      title: "Bulk Delete Categories",
      message: `Are you sure you want to delete ${selectedCategoryIds.size} categories? This action cannot be undone.`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsRefreshing(true);
        const ids = Array.from(selectedCategoryIds);
        let successCount = 0;
        for (const id of ids) {
          try {
            const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
            if (res.ok) successCount++;
          } catch (e) {}
        }
        if (successCount > 0) {
          toast.success(`Deleted ${successCount} categories`);
          fetchCategories();
          setSelectedCategoryIds(new Set());
        } else {
          toast.error("Failed to delete categories");
        }
        setIsRefreshing(false);
      }
    });
  };

  /** ----------------------
   * Pharmacy CRUD (RLS-compatible)
   -----------------------*/
  function openAddPharmacyModal() {
    setEditingPharmacy(null);
    setPharmacyModalOpen(true);
  }

  function openEditPharmacyModal(phar: Pharmacy) {
    setEditingPharmacy(phar);
    setPharmacyModalOpen(true);
  }

  function handlePharmacySaveSuccess() {
    if (editingPharmacy) {
      toast.success("Pharmacy updated");
    } else {
      toast.success("Pharmacy added");
    }
    fetchPharmacies();
    closeAllModals();
  }

  const handlePharmacyDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Pharmacy",
      message: "Are you sure you want to delete this pharmacy? This action cannot be undone.",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/pharmacies?id=${id}`, { method: "DELETE" });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to delete pharmacy");
          toast.success("Pharmacy deleted");
          fetchPharmacies();
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Failed to delete pharmacy");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Hospital CRUD
   -----------------------*/
  function openAddHospitalModal() {
    setEditingHospital(null);
    setHospitalModalOpen(true);
  }

  function openEditHospitalModal(hosp: Hospital) {
    setEditingHospital(hosp);
    setHospitalModalOpen(true);
  }

  function handleHospitalSaveSuccess() {
    if (editingHospital) {
      toast.success("Hospital updated");
    } else {
      toast.success("Hospital added");
    }
    fetchHospitals();
    closeAllModals();
  }

  const handleHospitalDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Hospital",
      message: "Are you sure you want to delete this hospital? This action cannot be undone.",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/hospitals?id=${id}`, { method: "DELETE" });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to delete hospital");
          toast.success("Hospital deleted");
          fetchHospitals();
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Failed to delete hospital");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Insurance CRUD
   -----------------------*/
  function openAddInsuranceModal() {
    setEditingInsurance(null);
    setInsuranceModalOpen(true);
  }

  function openEditInsuranceModal(ins: Insurance) {
    setEditingInsurance(ins);
    setInsuranceModalOpen(true);
  }

  function handleInsuranceSaveSuccess() {
    if (editingInsurance) {
      toast.success("Insurance updated");
    } else {
      toast.success("Insurance added");
    }
    fetchInsurances();
    closeAllModals();
  }

  const handleInsuranceDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Insurance",
      message: "Are you sure you want to delete this insurance? This action cannot be undone.",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/insurances?id=${id}`, {
            method: "DELETE",
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to delete insurance");
          toast.success("Insurance deleted");
          fetchInsurances();
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Failed to delete insurance");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Banner CRUD
   -----------------------*/
  function openAddBannerModal() {
    setEditingBanner(null);
    setBannerModalOpen(true);
  }

  function openEditBannerModal(banner: Banner) {
    const bannerWithFullUrl = {
      ...banner,
      image: banner.image && !banner.image.startsWith("http")
        ? `${BANNER_URL_PREFIX}${banner.image}`
        : banner.image
    };
    setEditingBanner(bannerWithFullUrl);
    setBannerModalOpen(true);
  }

  function handleBannerSaveSuccess() {
    if (editingBanner) {
      toast.success("Banner updated");
    } else {
      toast.success("Banner added");
    }
    fetchBanners();
    closeAllModals();
  }

  const handleBannerDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Banner",
      message: "Are you sure you want to delete this banner? This action cannot be undone.",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/banners?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Banner deleted");
            fetchBanners();
          } else throw new Error();
        } catch (err) {
          toast.error("Failed to delete banner");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  const toggleSelectBanner = (id: string) => {
    setSelectedBannerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllBanners = () => {
    if (selectedBannerIds.size === banners.length) {
      setSelectedBannerIds(new Set());
    } else {
      setSelectedBannerIds(new Set(banners.map(b => b.id)));
    }
  };

  const handleBulkBannerDelete = () => {
    if (selectedBannerIds.size === 0) return;
    setConfirmModal({
      title: "Bulk Delete Banners",
      message: `Are you sure you want to delete ${selectedBannerIds.size} banners? This action cannot be undone.`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsRefreshing(true);
        const ids = Array.from(selectedBannerIds);
        let successCount = 0;
        for (const id of ids) {
          try {
            const res = await fetch(`/api/banners?id=${id}`, { method: "DELETE" });
            if (res.ok) successCount++;
          } catch (e) {}
        }
        if (successCount > 0) {
          toast.success(`Deleted ${successCount} banners`);
          fetchBanners();
          setSelectedBannerIds(new Set());
        } else {
          toast.error("Failed to delete banners");
        }
        setIsRefreshing(false);
      }
    });
  };

  /** ----------------------
   * Deal CRUD
   -----------------------*/
  function openAddDealModal() {
    setEditingDeal(null);
    setDealModalOpen(true);
  }

  function openEditDealModal(deal: Deal) {
    const dealWithFullUrl = {
      ...deal,
      image: deal.image && !deal.image.startsWith("http")
        ? `${DEAL_URL_PREFIX}${deal.image}`
        : deal.image
    };
    setEditingDeal(dealWithFullUrl);
    setDealModalOpen(true);
  }

  const toggleSelectDeal = (id: string) => {
    setSelectedDealIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllDeals = () => {
    if (selectedDealIds.size === deals.length) {
      setSelectedDealIds(new Set());
    } else {
      setSelectedDealIds(new Set(deals.map(d => d.id)));
    }
  };

  const handleBulkDealDelete = () => {
    if (selectedDealIds.size === 0) return;
    setConfirmModal({
      title: "Bulk Delete Deals",
      message: `Are you sure you want to delete ${selectedDealIds.size} deals? This action cannot be undone.`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsRefreshing(true);
        const ids = Array.from(selectedDealIds);
        let successCount = 0;
        for (const id of ids) {
          try {
            const res = await fetch(`/api/deals?id=${id}`, { method: "DELETE" });
            if (res.ok) successCount++;
          } catch (e) {}
        }
        if (successCount > 0) {
          toast.success(`Deleted ${successCount} deals`);
          fetchDeals();
          setSelectedDealIds(new Set());
        } else {
          toast.error("Failed to delete deals");
        }
        setIsRefreshing(false);
      }
    });
  };

  const toggleSelectStory = (id: string) => {
    setSelectedStoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllStories = () => {
    if (selectedStoryIds.size === stories.length) {
      setSelectedStoryIds(new Set());
    } else {
      setSelectedStoryIds(new Set(stories.map(s => s.id)));
    }
  };

  const handleBulkStoryDelete = () => {
    if (selectedStoryIds.size === 0) return;
    setConfirmModal({
      title: "Bulk Delete Stories",
      message: `Are you sure you want to delete ${selectedStoryIds.size} stories? This action cannot be undone.`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsRefreshing(true);
        const ids = Array.from(selectedStoryIds);
        let successCount = 0;
        for (const id of ids) {
          try {
            const res = await fetch(`/api/stories?id=${id}`, { method: "DELETE" });
            if (res.ok) successCount++;
          } catch (e) {}
        }
        if (successCount > 0) {
          toast.success(`Deleted ${successCount} stories`);
          fetchStories();
          setSelectedStoryIds(new Set());
        } else {
          toast.error("Failed to delete stories");
        }
        setIsRefreshing(false);
      }
    });
  };

  const toggleSelectPost = (id: string) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPosts = () => {
    if (selectedPostIds.size === posts.length) {
      setSelectedPostIds(new Set());
    } else {
      setSelectedPostIds(new Set(posts.map(p => p.id)));
    }
  };

  const handleBulkPostDelete = () => {
    if (selectedPostIds.size === 0) return;
    setConfirmModal({
      title: "Bulk Delete Posts",
      message: `Are you sure you want to delete ${selectedPostIds.size} posts? This action cannot be undone.`,
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsRefreshing(true);
        const ids = Array.from(selectedPostIds);
        let successCount = 0;
        for (const id of ids) {
          try {
            const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
            if (res.ok) successCount++;
          } catch (e) {}
        }
        if (successCount > 0) {
          toast.success(`Deleted ${successCount} posts`);
          fetchPosts();
          setSelectedPostIds(new Set());
        } else {
          toast.error("Failed to delete posts");
        }
        setIsRefreshing(false);
      }
    });
  };

  function handleDealSaveSuccess() {
    if (editingDeal) {
      toast.success("Deal updated");
    } else {
      toast.success("Deal added");
    }
    fetchDeals();
    closeAllModals();
  }

  const handleDealDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Deal",
      message: "Are you sure you want to delete this deal?",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/deals?id=${id}`, {
            method: "DELETE",
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to delete deal");
          toast.success("Deal deleted");
          fetchDeals();
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Failed to delete deal");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Doctor CRUD
   -----------------------*/
  function openAddDoctorModal() {
    setEditingDoctor(null);
    setDoctorModalOpen(true);
  }

  function openEditDoctorModal(doc: Doctor) {
    setEditingDoctor(doc);
    setDoctorModalOpen(true);
  }

  function handleDoctorSaveSuccess() {
    if (editingDoctor) {
      toast.success("Doctor updated");
    } else {
      toast.success("Doctor added");
    }
    fetchDoctors();
    closeAllModals();
  }

  const handleDoctorDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Doctor",
      message: "Are you sure you want to delete this doctor?",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/doctors?id=${id}`, {
            method: "DELETE",
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to delete doctor");
          toast.success("Doctor deleted");
          fetchDoctors();
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Failed to delete doctor");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Medicine CRUD
   -----------------------*/
  function openAddMedicineModal() {
    setEditingMedicine(null);
    setMedicineModalOpen(true);
  }

  function openEditMedicineModal(med: Medicine) {
    setEditingMedicine(med);
    setMedicineModalOpen(true);
  }

  function handleMedicineSaveSuccess() {
    if (editingMedicine) {
      toast.success("Medicine updated");
    } else {
      toast.success("Medicine added");
    }
    fetchMedicines();
    closeAllModals();
  }

  const handleMedicineDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Medicine",
      message: "Are you sure you want to delete this medicine?",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/medicines?id=${id}`, {
            method: "DELETE",
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Failed to delete medicine");
          toast.success("Medicine deleted");
          fetchMedicines();
        } catch (err) {
          console.error(err);
          toast.error(err instanceof Error ? err.message : "Failed to delete medicine");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Story CRUD
   -----------------------*/
  function openAddStoryModal() {
    setEditingStory(null);
    setStoryModalOpen(true);
  }

  function openEditStoryModal(story: Story) {
    setEditingStory(story);
    setStoryModalOpen(true);
  }

  function handleStorySaveSuccess() {
    if (editingStory) {
      toast.success("Story updated");
    } else {
      toast.success("Story added");
    }
    fetchStories();
    closeAllModals();
  }

  const handleStoryDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Story",
      message: "Are you sure you want to delete this story?",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/stories?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete story");
          toast.success("Story deleted");
          fetchStories();
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete story");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Post CRUD
   -----------------------*/
  function openAddPostModal() {
    setEditingPost(null);
    setPostModalOpen(true);
  }

  function openEditPostModal(post: Post) {
    setEditingPost(post);
    setPostModalOpen(true);
  }

  function handlePostSaveSuccess() {
    if (editingPost) {
      toast.success("Post updated");
    } else {
      toast.success("Post added");
    }
    fetchPosts();
    closeAllModals();
  }

  const handlePostDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Post",
      message: "Are you sure you want to delete this post?",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        setLoadingId(id);
        try {
          const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete post");
          toast.success("Post deleted");
          fetchPosts();
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete post");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Review CRUD
   -----------------------*/
  async function handleSaveReply(id: string) {
    console.log(`[DEBUG] SAVING REPLY - ID: ${id}, Text: "${adminReplyText}"`);

    // Attempt to get token from storage if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    setLoadingId(id);
    try {
      const url = `/api/admin/reviews/${id}/reply`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ admin_reply: adminReplyText }),
      });

      console.log(`[DEBUG] PUT Request to: ${url} | Status: ${res.status}`);

      if (!res.ok) {
        const resText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(resText);
        } catch (e) {
          console.error(`[DEBUG] Route not found or Server Error. URL: ${url} | Body: ${resText.substring(0, 100)}`);
          throw new Error(`Server error (${res.status}): ${res.statusText}`);
        }
        throw new Error(errorData.error || errorData.details || "Failed to save reply");
      }

      fetchReviews();
      setReplyingToId(null);
      toast.success("Reply saved");
    } catch (err) {
      console.error("[DEBUG] Catch block error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save reply");
    } finally {
      setLoadingId(null);
    }
  }

  /** ----------------------
   * Review CRUD
   -----------------------*/
  const handleReviewDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Review",
      message: "Are you sure you want to delete this review?",
      type: 'delete',
      onConfirm: async () => {
        setConfirmModal(null);
        console.log(`[DEBUG] DELETING REVIEW - ID: ${id}`);
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        setLoadingId(id);
        try {
          const res = await fetch(`/api/admin/reviews/${id}`, {
            method: "DELETE",
            headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) }
          });

          console.log(`[DEBUG] Delete response: ${res.status} ${res.statusText}`);
          if (!res.ok) {
            const resText = await res.text();
            console.error(`[DEBUG] Delete failed:`, resText.substring(0, 100));
            throw new Error("Failed to delete review");
          }

          fetchReviews();
          toast.success("Review deleted");
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete review");
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  /** ----------------------
   * Quick Visibility Toggles
   -----------------------*/
  async function toggleStoryVisibility(story: Story, field: "show_tag" | "show_website") {
    const newVal = story[field] === false ? true : false;
    const payload = { ...story, [field]: newVal };
    try {
      const res = await fetch(`/api/stories?id=${story.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setStories((prev) => prev.map((s) => (s.id === story.id ? { ...s, [field]: newVal } : s)));
      toast.success("Visibility updated");
    } catch {
      toast.error("Failed to update visibility");
    }
  }

  async function togglePostVisibility(post: Post, field: "show_website" | "show_whatsapp" | "show_instagram" | "show_twitter") {
    const newVal = post[field] === false ? true : false;
    const payload = { ...post, [field]: newVal };
    try {
      const res = await fetch(`/api/posts?id=${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, [field]: newVal } : p)));
      toast.success("Visibility updated");
    } catch {
      toast.error("Failed to update visibility");
    }
  }

  async function viewStats(type: 'story' | 'post-likes' | 'post-views', id: string, title: string, extra?: any) {
    setLoadingId(id + type);

    let url = "";
    if (type === 'story') url = `/api/admin/stats/story/${id}`;
    else if (type === 'post-likes') url = `/api/admin/stats/post/${id}/likes`;
    else url = `/api/admin/stats/post/${id}/views`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      let extraInfo;
      if (type === 'story') {
        const uniqueUserIds = new Set(data.map((item: any) => item.user_id));
        extraInfo = `Total Unique Viewers: ${uniqueUserIds.size}`;
      } else if (type === 'post-likes') {
        const uniqueUserIds = new Set(data.map((item: any) => item.user_id));
        extraInfo = `Total Likes: ${data.length}, Unique Likers: ${uniqueUserIds.size}`;
      } else if (type === 'post-views') {
        const uniqueUserIds = new Set(data.map((item: any) => item.user_id));
        extraInfo = `Total Views: ${data.length}, Unique Viewers: ${uniqueUserIds.size}`;
      }
      setStatsModal({ isOpen: true, title: `Interactions: ${title}`, data: Array.isArray(data) ? data : [], extraInfo });
    } catch (e) {
      toast.error("Failed to fetch stats");
    } finally {
      setLoadingId(null);
    }
  }

  // Function to export stats to CSV
  const exportStatsToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster />
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 shadow-md fixed h-full overflow-y-auto z-10 flex flex-col border-r border-gray-200">
        <div className="p-6 border-b">
          <h1 className="text-2xl text-center font-bold text-gray-800">Admin Panel</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => handleNavClick("overall-view")}
            className={`w-full text-left p-3 text-xs font-semibold bg-gray-800 text-white rounded-lg transition-all cursor-pointer ${activeView === 'overall-view' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Overall View
          </button>
          <button
            onClick={() => handleNavClick("users")}
            className={`w-full text-left p-3 text-xs font-semibold bg-blue-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'users' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Users
          </button>
          <button
            onClick={() => handleNavClick("orders")}
            className={`w-full text-left p-3 text-xs font-semibold bg-gray-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'orders' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Orders
          </button>
          <button
            onClick={() => handleNavClick("applications", "doctor")}
            className={`w-full text-left p-3 text-xs font-semibold bg-pink-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'applications' && applicationType === 'doctor' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Doctor Applications
          </button>
          <button
            onClick={() => handleNavClick("applications", "pharmacy")}
            className={`w-full text-left p-3 text-xs font-semibold bg-purple-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'applications' && applicationType === 'pharmacy' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Pharma Applications
          </button>
          <button
            onClick={() => handleNavClick("applications", "hospital")}
            className={`w-full text-left p-3 text-xs font-semibold bg-green-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'applications' && applicationType === 'hospital' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Hospitals Applications
          </button>
          <button
            onClick={() => handleNavClick("applications", "insurance")}
            className={`w-full text-left p-3 text-xs font-semibold bg-teal-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'applications' && applicationType === 'insurance' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Insu Applications
          </button>
          <button
            onClick={() => handleNavClick("doctor-bookings")}
            className={`w-full text-left p-3 text-xs font-semibold bg-fuchsia-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'doctor-bookings' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Doctor Bookings
          </button>
          <button
            onClick={() => handleNavClick("hospital-bookings")}
            className={`w-full text-left p-3 text-xs font-semibold bg-emerald-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'hospital-bookings' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Hospital Bookings
          </button>
          <button
            onClick={() => handleNavClick("bus")}
            className={`w-full text-left p-3 text-xs font-semibold bg-slate-600 text-white rounded-lg transition-all cursor-pointer ${activeView === 'bus' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Bus
          </button>
          <button
            onClick={() => handleNavClick("bus-bookings")}
            className={`w-full text-left p-3 text-xs font-semibold bg-zinc-600 text-white rounded-lg transition-all cursor-pointer ${activeView === 'bus-bookings' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Bus Bookings
          </button>
          <button
            onClick={() => handleNavClick("withdrawals")}
            className={`w-full text-left p-3 text-xs font-semibold bg-orange-600 text-white rounded-lg transition-all cursor-pointer ${activeView === 'withdrawals' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Withdrawals
          </button>
          <button
            onClick={() => handleNavClick("service-fees")}
            className={`w-full text-left p-3 text-xs font-semibold bg-cyan-600 text-white rounded-lg transition-all cursor-pointer ${activeView === 'service-fees' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Service Fees
          </button>
          <button
            onClick={() => handleNavClick("ep-threshold")}
            className={`w-full text-left p-3 text-xs font-semibold bg-violet-600 text-white rounded-lg transition-all cursor-pointer ${activeView === 'ep-threshold' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage EP Threshold
          </button>
          <button
            onClick={() => handleNavClick("engagement-points")}
            className={`w-full text-left p-3 text-xs font-semibold bg-emerald-600 text-white rounded-lg transition-all cursor-pointer ${activeView === 'engagement-points' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage EP Rewards
          </button>
          <button
            onClick={() => handleNavClick("manage-buttons")}
            className={`w-full text-left p-3 text-xs font-semibold bg-blue-800 text-white rounded-lg transition-all cursor-pointer ${activeView === 'manage-buttons' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Buttons
          </button>
          <button
            onClick={() => handleNavClick("stock")}
            className={`w-full text-left p-3 text-xs font-semibold bg-indigo-500 text-white rounded-lg transition-all cursor-pointer ${activeView === "stock"
              ? "ring-2 ring-offset-2 ring-black"
              : ""
              }`}
          >
            Manage Stock
          </button>
          <button
            onClick={() => handleNavClick("categories")}
            className={`w-full text-left p-3 text-xs font-semibold bg-yellow-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'categories' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Categories
          </button>
          <button
            onClick={() => handleNavClick("reviews")}
            className={`w-full text-left p-3 text-xs font-semibold bg-yellow-600 text-white rounded-lg transition-all cursor-pointer ${activeView === 'reviews' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Reviews
          </button>
          <button
            onClick={() => handleNavClick("banners")}
            className={`w-full text-left p-3 text-xs font-semibold bg-red-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'banners' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Banners
          </button>
          <button
            onClick={() => handleNavClick("deals")}
            className={`w-full text-left p-3 text-xs font-semibold bg-orange-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'deals' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Deals
          </button>
          <button
            onClick={() => handleNavClick("stories")}
            className={`w-full text-left p-3 text-xs font-semibold bg-rose-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'stories' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Stories
          </button>
          <button
            onClick={() => handleNavClick("posts")}
            className={`w-full text-left p-3 text-xs font-semibold bg-sky-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'posts' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Posts
          </button>
          <button
            onClick={() => handleNavClick("leaderboard")}
            className={`w-full text-left p-3 text-xs font-semibold bg-amber-500 text-white rounded-lg transition-all cursor-pointer ${activeView === 'leaderboard' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Engagement Leaderboard
          </button>
        </nav>

        <div className="p-4 border-t">
          <button onClick={handleSignOut} disabled={isSigningOut} className="w-full p-3 text-center bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer">
            {isSigningOut ? <Spinner /> : (
              <>
                <span>Sign Out</span>
                <span>⏻</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            {user?.fullname && <p className="text-md text-gray-600 mt-1">Welcome, {user.fullname}</p>}
          </div>
        </div>

        {/* Welcome Message on initial load */}
        {activeView === null && (
          <div className="text-center p-10 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold">Welcome back MSC. IT. ENG. JEAN KEVIN GAHUNGU</h2>
          </div>
        )}

        {activeView === "withdrawals" && (
          <div className="bg-white rounded-lg shadow p-10 text-center animate-in fade-in duration-500">
            <div className="text-6xl mb-4">🏦</div>
            <h2 className="text-2xl font-bold text-gray-800">Withdrawals Management</h2>
            <p className="text-gray-500 mt-2">This feature is currently under development.</p>
            <div className="mt-6 inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full font-bold text-sm">Coming Soon</div>
          </div>
        )}

        {activeView === "overall-view" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-800">Platform Performance Overview</h2>
              <button onClick={fetchOverallStats} className="bg-white border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Refresh Stats</button>
            </div>

            {/* Partner Stats */}
            {/* Individual Partner Cards */}
            {([
              { type: 'doctors', label: 'Approved Doctors', icon: '🩺', color: 'bg-pink-500', prefix: DOCTOR_URL_PREFIX },
              { type: 'hospitals', label: 'Approved Hospitals', icon: '🏥', color: 'bg-green-500', prefix: HOSPITAL_URL_PREFIX },
              { type: 'insurances', label: 'Approved Insurances', icon: '🛡️', color: 'bg-teal-500', prefix: INSURANCE_URL_PREFIX },
              { type: 'pharmacies', label: 'Approved Pharmacies', icon: '💊', color: 'bg-purple-500', prefix: PHARMACY_URL_PREFIX },
            ] as const).map((category) => {
              // Type guard to ensure we are accessing array properties of overallStats
              const entityType = category.type as keyof Omit<OverallStats, 'admin'>;
              const entities = overallStats[entityType];

              return (
              <div key={category.type} className="mb-8">
                <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-4">{category.label}</h3>
                {entities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {entities.map((partner) => (
                      <div key={partner.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-transform hover:scale-[1.02]">
                        <div className="flex items-center mb-4">
                          {partner.image ? (
                            <img
                              src={partner.image.startsWith('http') ? partner.image : `${category.prefix}${partner.image}`}
                              alt={partner.name}
                              className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-gray-200"
                            />
                          ) : (
                            <div className={`p-3 rounded-full ${category.color} text-white text-xl mr-4 shadow-lg`}>
                              {category.icon}
                            </div>
                          )}
                          <h4 className="text-lg font-bold text-gray-800 flex-1">{partner.name}</h4>
                        </div>
                        <div className="pt-4 border-t border-gray-50">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Earned</p>
                          <p className="text-xl font-bold text-green-600">
                            {partner.revenue.toLocaleString()} <span className="text-xs font-normal text-gray-400">BIF</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 rounded-xl text-center text-gray-500">
                    No {category.label.toLowerCase()} found.
                  </div>
                )}
              </div>
            )})}
            
            {/* Admin Revenue Stats */}
            <div>
              <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-4">Admin Revenue</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-linear-to-br from-indigo-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl lg:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">
                        Total Admin Earnings
                      </p>
                      <h4 className="text-4xl font-black mt-1">
                        {overallStats.admin.total.toLocaleString()}{" "}
                        <span className="text-lg font-normal opacity-70">BIF</span>
                      </h4>
                    </div>
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                      <span className="text-4xl">💰</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-8 border-t border-white/20 pt-6">
                    <div>
                      <p className="text-indigo-100 text-xs font-bold uppercase">Service Fees</p>
                      <p className="text-2xl font-bold mt-1">
                        {overallStats.admin.serviceFees.toLocaleString()}{" "}
                        <span className="text-sm opacity-70">BIF</span>
                      </p>
                      <p className="text-[10px] text-indigo-200 mt-1">From orders & bookings</p>
                    </div>
                    <div>
                      <p className="text-indigo-100 text-xs font-bold uppercase">Login/Access Fees</p>
                      <p className="text-2xl font-bold mt-1">
                        {overallStats.admin.loginFees.toLocaleString()}{" "}
                        <span className="text-sm opacity-70">BIF</span>
                      </p>
                      <p className="text-[10px] text-indigo-200 mt-1">From view access deductions</p>
                    </div>
                    <div>
                      <p className="text-indigo-100 text-xs font-bold uppercase">Bus Fees</p>
                      <p className="text-2xl font-bold mt-1">
                        {overallStats.admin.busFees.toLocaleString()}{" "}
                        <span className="text-sm opacity-70">BIF</span>
                      </p>
                      <p className="text-[10px] text-indigo-200 mt-1">From JK BUS tickets</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
                  <h4 className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-4">Revenue Split</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-600">Service Fees</span>
                        {overallStats.admin.total > 0 && (
                          <span className="font-bold text-indigo-600">
                            {Math.round(
                              (overallStats.admin.serviceFees /
                                overallStats.admin.total) *
                                100
                            )}
                            %
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${overallStats.admin.total > 0 ? (overallStats.admin.serviceFees / overallStats.admin.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-600">Access Fees</span>
                        {overallStats.admin.total > 0 && (
                          <span className="font-bold text-blue-400">
                            {Math.round(
                              (overallStats.admin.loginFees /
                                overallStats.admin.total) *
                                100
                            )}
                            %
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full" style={{ width: `${overallStats.admin.total > 0 ? (overallStats.admin.loginFees / overallStats.admin.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-600">Bus Fees</span>
                        {overallStats.admin.total > 0 && (
                          <span className="font-bold text-slate-500">
                            {Math.round(
                              (overallStats.admin.busFees /
                                overallStats.admin.total) *
                                100
                            )}
                            %
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-slate-500 h-full" style={{ width: `${overallStats.admin.total > 0 ? (overallStats.admin.busFees / overallStats.admin.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "hospital-bookings" && (
          <div className="bg-white rounded-lg shadow p-10 text-center animate-in fade-in duration-500">
            <div className="text-6xl mb-4">🏥</div>
            <h2 className="text-2xl font-bold text-gray-800">Hospital Bookings Management</h2>
            <p className="text-gray-500 mt-2">This feature is currently under development.</p>
            <div className="mt-6 inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full font-bold text-sm">Coming Soon</div>
          </div>
        )}

        {isRefreshing ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Spinner className="h-12 w-12 text-blue-500" />
            <p className="text-gray-500 font-medium animate-pulse">Updating dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Engagement Leaderboard */}
            {activeView === "leaderboard" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Engagement Leaderboard (Top 50)</h2>
                  <button onClick={fetchLeaderboard} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 transition-colors">Refresh</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3">Rank</th>
                        <th className="p-3">User Name</th>
                        <th className="p-3">WhatsApp</th>
                        <th className="p-3">Country</th>
                        <th className="p-3">Engagement Points (EP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, index) => (
                        <tr key={entry.id || `leaderboard-${index}`} className={`border-t ${index < 3 ? 'bg-amber-50' : ''}`}>
                          <td className="p-3 font-bold">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </td>
                          <td className="p-3 font-semibold text-gray-800">{entry.fullname}</td>
                          <td className="p-3 text-gray-600">{entry.whatsapp_number}</td>
                          <td className="p-3 text-gray-600">{entry.country}</td>
                          <td className="p-3">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                              {(entry.engagement_points || 0).toLocaleString()} EP
                            </span>
                          </td>
                        </tr>
                      ))}
                      {leaderboard.length === 0 && (
                        <tr key="no-data"><td colSpan={5} className="p-10 text-center text-gray-400">No data found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Service Fees */}
            {activeView === "service-fees" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Manage Service Fees</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setFeeModalOpen(true)} className="text-sm bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors shadow-sm font-semibold cursor-pointer">+ Add New Fee</button>
                    <button onClick={fetchServiceFees} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 transition-colors">Refresh</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3">Service Type</th>
                        <th className="p-3">Country</th>
                        <th className="p-3">Fee (BIF/Currency)</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceFees.map((fee, index) => {
                        const rowId = fee.id || `fee-${index}`;
                        return (
                          <tr key={rowId} className="border-t">
                            <td className="p-3 font-semibold text-gray-800 capitalize">{fee.service_type}</td>
                            <td className="p-3 text-gray-600">{fee.country}</td>
                            <td className="p-3">
                              {editingFeeId === rowId ? (
                                <input
                                  type="number"
                                  value={tempFeeValue}
                                  onChange={(e) => setTempFeeValue(e.target.value)}
                                  className="border rounded px-2 py-1 w-32 focus:ring-2 focus:ring-cyan-500 outline-none"
                                  autoFocus
                                />
                              ) : (
                                <span className="font-bold text-green-600">{Number(fee.fee).toLocaleString()}</span>
                              )}
                            </td>
                            <td className="p-3">
                              {editingFeeId === rowId ? (
                                <div className="flex gap-2">
                                  <button onClick={() => handleUpdateServiceFee(fee.id)} className="btn-save cursor-pointer">
                                    {loadingId === fee.id ? "Saving..." : "Save"}
                                  </button>
                                  <button onClick={() => setEditingFeeId(null)} className="btn-cancel cursor-pointer">Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingFeeId(rowId); setTempFeeValue(fee.fee.toString()); }}
                                  className="btn-edit cursor-pointer"
                                >
                                  Edit Fee
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add Fee Modal Overlay */}
            {feeModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                  <h3 className="text-xl font-bold mb-4">Add New Service Fee</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Type</label>
                      <select
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                        value={newFee.service_type}
                        onChange={e => setNewFee(p => ({ ...p, service_type: e.target.value }))}
                      >
                        <option value="bus">Bus Service Fee</option>
                        <option value="doctor">Doctor Booking Fee</option>
                        <option value="medicine">Medicine Service Fee</option>
                        <option value="access">App Access Fee</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
                      <input type="text" placeholder="e.g. Burundi" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none" value={newFee.country} onChange={e => setNewFee(p => ({ ...p, country: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fee Amount</label>
                      <input type="number" placeholder="0" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none" value={newFee.fee} onChange={e => setNewFee(p => ({ ...p, fee: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8">
                    <button onClick={() => setFeeModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer">Cancel</button>
                    <button onClick={handleCreateServiceFee} className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-700 shadow-md cursor-pointer">Create Fee</button>
                  </div>
                </div>
              </div>
            )}

            {/* EP Threshold Management */}
            {activeView === "ep-threshold" && (
              <div className="bg-white rounded-lg shadow p-8 max-w-2xl mx-auto border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Manage Engagement Points Threshold</h2>
                <div className="bg-violet-50 border-l-4 border-violet-500 p-5 mb-8 rounded-r-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-full">
                      <span className="text-xl">📊</span>
                    </div>
                    <div>
                      <p className="text-sm text-violet-700 font-bold uppercase tracking-wider">Current Required EP</p>
                      <p className="text-3xl font-black text-violet-900 mt-1">{minEpThreshold?.toLocaleString() ?? "Loading..."}</p>
                    </div>
                  </div>
                  <p className="text-sm text-violet-600 mt-3 font-medium">This determines the minimum engagement points a user must have to book a bus ticket.</p>
                </div>

                <div className="space-y-10">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <label className="block text-sm font-black text-gray-400 uppercase mb-4 tracking-widest ml-1">
                      🚌 Bus Booking Eligibility (Min EP)
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="number"
                        value={newThresholdInput}
                        onChange={(e) => setNewThresholdInput(e.target.value)}
                        className="flex-1 border-2 border-gray-200 rounded-xl p-3 text-lg font-bold focus:border-violet-500 focus:ring-4 focus:ring-violet-50 outline-none transition-all"
                      />
                      <button
                        onClick={() => handleUpdateSettingValue('min_ep_required', newThresholdInput)}
                        className="btn-save min-w-[140px] cursor-pointer"
                      >Save</button>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <label className="block text-sm font-black text-gray-400 uppercase mb-4 tracking-widest ml-1">
                      💰 Monetization Goal Threshold
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="number"
                        value={epRewards.monetization_goal}
                        onChange={(e) => setEpRewards({ ...epRewards, monetization_goal: e.target.value })}
                        className="flex-1 border-2 border-gray-200 rounded-xl p-3 text-lg font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all"
                      />
                      <button
                        onClick={() => handleUpdateEpReward('monetization_goal', epRewards.monetization_goal)}
                        className="btn-save min-w-[140px] cursor-pointer"
                      >Save</button>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 italic">This goal appears on the user's account progress bar.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Engagement Points Rewards */}
            {activeView === "engagement-points" && (
              <div className="bg-white rounded-lg shadow p-8 max-w-2xl mx-auto border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Manage Engagement Point Rewards</h2>
                  <button onClick={fetchEpRewards} className="text-sm text-emerald-600 font-bold hover:underline cursor-pointer">Refresh Values</button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {[
                    { key: 'ep_story_view', label: 'Story View Reward', icon: '📱' },
                    { key: 'ep_post_view', label: 'Post View Reward', icon: '🖼️' },
                    { key: 'ep_post_like', label: 'Post Like Reward', icon: '❤️' },
                    { key: 'monetization_goal', label: 'Monetization Goal Threshold', icon: '💰' },
                  ].map((item) => (
                    // Explicitly cast item.key to a key of epRewards to satisfy TypeScript
                    // This is safe because we control the keys in the array and the epRewards type
                    // The `as keyof typeof epRewards` assertion is necessary because TypeScript
                    // cannot infer that `item.key` will always be a valid key of `epRewards`
                    <div key={item.key} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                      <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">
                        {item.icon} {item.label}
                      </label>
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <input
                            type="number" // Use type="number" for numerical inputs
                            value={String(epRewards[item.key as keyof typeof epRewards])}
                            onChange={(e) =>
                              setEpRewards({ ...epRewards, [item.key as keyof typeof epRewards]: e.target.value })
                            }
                            className="w-full border-2 border-gray-200 rounded-xl p-3 pl-10 text-lg font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">EP</span>
                        </div>
                        <button
                          onClick={() => handleUpdateEpReward(item.key, epRewards[item.key as keyof typeof epRewards])}
                          disabled={isRefreshing}
                          className="btn-save min-w-[120px] cursor-pointer"
                        >
                          {isRefreshing ? <Spinner /> : "Update"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Add Story Duration input */}
                  <div key="story_duration" className="p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                    <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">
                      ⏱️ Story Duration (ms)
                    </label>
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={epRewards.story_duration}
                          onChange={(e) => setEpRewards({ ...epRewards, story_duration: e.target.value })}
                          className="w-full border-2 border-gray-200 rounded-xl p-3 pl-10 text-lg font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ms</span>
                      </div>
                      <button
                        onClick={() => handleUpdateEpReward('story_duration', epRewards.story_duration)}
                        disabled={isRefreshing}
                        className="btn-save min-w-[120px] cursor-pointer"
                      >
                        {isRefreshing ? <Spinner /> : "Update"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Manage Buttons */}
            {activeView === "manage-buttons" && (
              <div className="bg-white rounded-lg shadow p-8 max-w-2xl mx-auto border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                  Manage App Visibility Buttons
                </h2>

                <div className="space-y-6">
                  {[
                    { key: 'show_add_to_cart_button', label: 'Show "Add to Cart" Button (Products)' },
                    { key: 'show_product_cta_button', label: 'Show "Call Car" in Product Details' },
                    { key: 'show_doctor_cta_button', label: 'Show "Call Car" in Doctor Details' },
                    { key: 'show_hospital_cta_button', label: 'Show "Call Car" in Hospital Details' },
                    { key: 'show_insurance_cta_button', label: 'Show "Call Car" in Insurance Details' },
                    { key: 'show_pharmacy_cta_button', label: 'Show "Call Car" in Pharmacy Details' },
                    { key: 'show_book_online_button', label: 'Show "Book Online" Button (Doctors)' },
                    { key: 'show_book_in_office_button', label: 'Show "Book In Office" Button (Doctors)' },
                    { key: 'show_orders_button', label: 'Show "Orders" Button (Account Screen)' }, // New
                    { key: 'show_my_appointments_button', label: 'Show "My Appointments" Button (Account Screen)' }, // New
                    { key: 'show_book_bus_button', label: 'Show "Book a JK BUS" Button (Account Screen)' }, // New
                    { key: 'show_my_bus_tickets_button', label: 'Show "My Bus Tickets" Button (Account Screen)' }, // New
                  ].map((btn) => (
                    <div key={btn.key} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                      <label className="block text-sm font-bold text-gray-700">{btn.label}</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!epRewards[btn.key as keyof EpRewards]}
                          onChange={(e) => handleUpdateEpReward(btn.key, e.target.checked)}
                          disabled={isRefreshing}
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                  {isRefreshing && (
                    <div className="flex items-center justify-center text-blue-600">
                      <Spinner className="h-5 w-5 mr-2" /> Updating...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users */}
            {activeView === "users" && (
              <div className="overflow-x-auto">
                <UsersTable key={refreshKey} />
              </div>
            )}

            {/* Orders */}
            {activeView === "orders" && (
              <div className="overflow-x-auto">
                <OrdersTable key={refreshKey} />
              </div>
            )}

            {/* Applications */}
            {activeView === "applications" && applicationType && ( // Ensure applicationType is not null
              <div className="overflow-x-auto">
                <ApplicationsTable key={`${applicationType}-${refreshKey}`} type={applicationType} />
              </div>
            )}

            {/* Doctor Bookings */}
            {activeView === "doctor-bookings" && (
              <div className="overflow-x-auto">
                <DoctorBookingsTable key={refreshKey} />
              </div>
            )}

            {/* Bus Management */}
            {activeView === "bus" && (
              <div className="overflow-x-auto">
                <BusesTable key={refreshKey} />
              </div>
            )}

            {/* Bus Bookings */}
            {activeView === "bus-bookings" && (
              <div className="overflow-x-auto">
                <BusBookingsTable key={refreshKey} />
              </div>
            )}

            {/* Medicines */}
            {activeView === "stock" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Pharmacy Inventory Management</h2>
                  <div className="w-full max-w-xs">
                    <input
                      type="text"
                      placeholder="Search stock by name..."
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {pharmacies.length === 0 ? (
                  <p className="p-4 text-center text-gray-500">No pharmacies available to manage stock.</p>
                ) : (
                  <>
                    {pharmacies.map((pharmacy) => {
                      const filteredStock = medicines
                        .filter(med => med.pharmacy_id === pharmacy.id)
                        .filter(med => med.name.toLowerCase().includes(stockSearchQuery.toLowerCase()));

                      if (filteredStock.length === 0) return null;

                      return (
                        <div key={pharmacy.id} className="mb-8 p-4 border rounded-lg bg-gray-50 last:mb-0">
                          <h3 className="text-xl font-bold mb-4 text-gray-800">{pharmacy.name}'s Stock</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="p-2">Image</th>
                                  <th className="p-2">Name</th>
                                  <th className="p-2">Price</th>
                                  <th className="p-2">Quantity</th>
                                  <th className="p-2">Category</th>
                                  <th className="p-2">Insurances</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredStock.map((med, index) => (
                                  <tr key={med.id || `stock-${index}`} className="border-t">
                                    <td className="p-2">
                                      {med.image ? (
                                        <img
                                          src={med.image.startsWith("http") ? med.image : `https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/${med.image}`}
                                          alt={med.name}
                                          className="w-16 h-16 object-cover rounded"
                                        />
                                      ) : (
                                        <span className="text-gray-400">No Image</span>
                                      )}
                                    </td>
                                    <td className="p-2 font-medium">{med.name}</td>
                                    <td className="p-2">₹{med.price}</td>
                                    <td className="p-2">
                                      <span className={`font-semibold ${Number(med.quantity) <= 5 ? 'text-red-600' : 'text-gray-700'}`}>
                                        {med.quantity}
                                      </span>
                                    </td>
                                    <td className="p-2">{categories.find(c => c.id === med.category_id)?.name || 'N/A'}</td>
                                    <td className="p-2 max-w-sm">
                                      <div className="flex flex-wrap gap-1">
                                        {med.insurances?.map((ins: string) => (
                                          <span key={ins} className="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded-full">
                                            {ins}
                                          </span>
                                        ))}
                                        {(!med.insurances || med.insurances.length === 0) && (
                                          <span className="text-xs text-gray-400 italic">All pharmacy insurances</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                    {stockSearchQuery && !pharmacies.some(p =>
                      medicines.some(med => med.pharmacy_id === p.id && med.name.toLowerCase().includes(stockSearchQuery.toLowerCase()))
                    ) && (
                        <div className="p-10 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                          No items matching "{stockSearchQuery}" found in any pharmacy.
                        </div>
                      )}
                  </>
                )}

                <MedicineModal
                  isOpen={medicineModalOpen}
                  onClose={closeAllModals}
                  editingMedicine={editingMedicine}
                  onSuccess={handleMedicineSaveSuccess}
                  categories={categories}
                  allPharmacies={pharmacies}
                />
              </div>
            )}

            {/* Categories */}
            {activeView === "categories" && (
              <div className="space-y-4">
                <div className="flex justify-between items-start pt-2 px-1">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-2xl font-bold text-gray-800">Manage Categories</h2>
                      {!isRefreshing && categories.length > 0 && (
                        <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">
                          {categories.length}
                        </span>
                      )}
                    </div>

                    {selectedCategoryIds.size > 0 && (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                        <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                          {selectedCategoryIds.size} selected
                        </span>
                        <button
                          onClick={handleBulkCategoryDelete}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 cursor-pointer shadow-sm transition-colors"
                        >
                          Bulk Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={openAddCategoryModal}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold shadow-sm cursor-pointer"
                  >
                    + Add Category
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border border-gray-200">
                  <table className="w-full text-left border-collapse border border-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-20">
                      <tr>
                        <th className="p-2 border border-gray-200">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                            checked={selectedCategoryIds.size === categories.length && categories.length > 0}
                            onChange={toggleSelectAllCategories}
                          />
                        </th>
                        <th className="p-2">Image</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Medicines</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat.id || `category-${cat.name}`} className="border-t hover:bg-gray-50/50 transition-colors">
                          <td className="p-2 border border-gray-200">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                              checked={selectedCategoryIds.has(cat.id)}
                              onChange={() => toggleSelectCategory(cat.id)}
                            />
                          </td>
                          <td className="p-2">
                            {cat.image ? (
                              <img src={cat.image} alt={cat.name} className="w-8 h-8 object-contain" />
                            ) : (
                              <span className="text-gray-400 text-xs italic">No Image</span>
                            )}
                          </td>
                          <td className="p-2">{cat.name}</td>
                          <td className="p-2 text-xs text-gray-600">
                            {medicines.filter(m => m.category_id === cat.id).length} items
                            <span className="ml-1 text-gray-400">
                              ({medicines.filter(m => m.category_id === cat.id).map(m => m.name).slice(0, 2).join(', ')}...)
                            </span>
                          </td>
                          <td className="p-2 space-x-2">
                            <button
                              onClick={() => openEditCategoryModal(cat)}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCategoryDelete(cat.id)}
                              disabled={loadingId === cat.id}
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                            >
                              {loadingId === cat.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr key="no-categories">
                          <td colSpan={5} className="p-4 text-center text-gray-500">
                            No categories found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <CategoryModal
                  isOpen={categoryModalOpen}
                  onClose={closeAllModals}
                  editingCategory={editingCategory}
                  onSuccess={handleCategorySaveSuccess}
                />
              </div>
            )}

            {/* Reviews */}
            {activeView === "reviews" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Manage Reviews</h2>
                  <button onClick={fetchReviews} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 transition-colors cursor-pointer">Refresh</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Rating</th>
                        <th className="p-2">Comment</th>
                        <th className="p-2">Admin Reply</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((review, index) => (
                        <tr key={review.id || `review-${index}`} className="border-t">
                          <td className="p-2 font-medium">{review.name}</td>
                          <td className="p-2">
                            <div className="flex text-yellow-500">
                              {[...Array(5)].map((_, i) => (
                                <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 max-w-xs text-gray-800">{review.comment}</td>
                          <td className="p-2 max-w-md">
                            {review.admin_reply && (
                              <div className="p-2 bg-blue-50 border-l-2 border-blue-400 text-xs italic text-gray-600">
                                {review.admin_reply}
                              </div>
                            )}
                            {replyingToId === review.id && (
                              <div className="mt-2 space-y-2">
                                <textarea
                                  className="w-full p-2 border rounded text-xs"
                                  value={adminReplyText}
                                  onChange={(e) => setAdminReplyText(e.target.value)}
                                  placeholder="Type your reply..."
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveReply(review.id)}
                                    className="btn-save cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setReplyingToId(null)}
                                    className="btn-cancel cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-gray-500 text-xs">
                            {new Date(review.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => { setReplyingToId(review.id); setAdminReplyText(review.admin_reply || ""); }}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                              >
                                {review.admin_reply ? "Edit Reply" : "Reply"}
                              </button>
                              <button
                                onClick={() => handleReviewDelete(review.id)}
                                disabled={loadingId === review.id}
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black flex items-center gap-1"
                              >
                                {loadingId === review.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {reviews.length === 0 && (
                        <tr key="no-reviews">
                          <td
                            colSpan={5}
                            className="p-10 text-center text-gray-500"
                          >
                            No reviews found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pharmacies */}
            {activeView === "pharmacies" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Pharmacies</h2>
                  <button
                    onClick={openAddPharmacyModal}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-700"
                  >
                    + Add Pharmacy
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Image</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Accepted Insurances</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pharmacies.map((phar) => (
                        <tr key={phar.id || `pharma-${phar.name}`} className="border-t">
                          <td className="p-2">
                            {phar.image ? (
                              <img src={phar.image} alt={phar.name || 'Pharmacy image'} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <span className="text-gray-400">No Image</span>
                            )}
                          </td>
                          <td className="p-2">{phar.name}</td>
                          <td className="p-2 max-w-xs">
                            <div className="flex flex-col gap-2">
                              {Array.isArray(phar.locations) && phar.locations.length > 0 ? (
                                phar.locations.map((loc: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="px-3 py-2 bg-gray-50 border rounded-md flex flex-col"
                                  >
                                    <span className="font-medium text-gray-800">{loc.name}</span>
                                    <span className="text-xs text-gray-600">
                                      {loc.openingTime} - {loc.closingTime}
                                    </span>
                                    <span
                                      className={`text-xs font-semibold mt-1 ${loc.isOpen ? "text-green-600" : "text-red-600"
                                        }`}
                                    >
                                      {loc.isOpen ? "Open" : "Closed"}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-gray-400">No locations</span>
                              )}
                            </div>
                          </td>

                          <td className="p-2 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {phar.accepted_insurances?.map(name => (
                                <span key={name} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">{name}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 space-x-2">
                            <button
                              onClick={() => openEditPharmacyModal(phar)}
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handlePharmacyDelete(phar.id)}
                              disabled={loadingId === phar.id}
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                            >
                              {loadingId === phar.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {pharmacies.length === 0 && (
                        <tr key="no-pharmacies">
                          <td
                            colSpan={5}
                            className="p-4 text-center text-gray-500"
                          >
                            No pharmacies found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <PharmacyModal
                  isOpen={pharmacyModalOpen}
                  onClose={closeAllModals}
                  editingPharmacy={editingPharmacy}
                  onSuccess={handlePharmacySaveSuccess}
                  allInsurances={insurances}
                />
              </div>
            )}

            {/* Hospitals */}
            {activeView === "hospitals" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Hospitals</h2>
                  <button
                    onClick={openAddHospitalModal}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add Hospital
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Image</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Specialties</th>
                        <th className="p-2">Insurances</th>
                        <th className="p-2">Blood Types</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitals.map((hosp) => (
                        <tr key={hosp.id || `hosp-${hosp.name}`} className="border-t">
                          <td className="p-2">
                            {hosp.image ? (
                              <img src={hosp.image} alt={hosp.name || 'Hospital image'} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <span className="text-gray-400">No Image</span>
                            )}
                          </td>
                          <td className="p-2">{hosp.name}</td>
                          <td className="p-2 max-w-xs">
                            {(hosp.location as string[])?.join(", ")}
                          </td>
                          <td className="p-2 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {(hosp.specialties as string[])?.map(spec => (
                                <span key={spec} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {(hosp.insurances as string[])?.map(ins => (
                                <span key={ins} className="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded-full">
                                  {ins}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {(hosp.blood_types as string[])?.map(bt => (
                                <span key={bt} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">{bt}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 space-x-2">
                            <button onClick={() => openEditHospitalModal(hosp)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Edit</button>
                            <button onClick={() => handleHospitalDelete(hosp.id)} disabled={loadingId === hosp.id} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">
                              {loadingId === hosp.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {hospitals.length === 0 && (
                        <tr key="no-hospitals">
                          <td colSpan={7} className="p-4 text-center text-gray-500">
                            No hospitals found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <HospitalModal
                  isOpen={hospitalModalOpen}
                  onClose={closeAllModals}
                  editingHospital={editingHospital}
                  onSuccess={handleHospitalSaveSuccess}
                />
              </div>
            )}

            {/* Insurances */}
            {activeView === "insurances" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Insurances</h2>
                  <button
                    onClick={openAddInsuranceModal}
                    className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-700"
                  >
                    + Add Insurance
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Image</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Locations</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insurances.map((ins) => (
                        <tr key={ins.id || `ins-${ins.name}`} className="border-t">
                          <td className="p-2">
                            {ins.image ? (
                              <img src={ins.image} alt={ins.name || 'Insurance image'} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <span className="text-gray-400">No Image</span>
                            )}
                          </td>
                          <td className="p-2">{ins.name}</td>
                          <td className="p-2 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {ins.locations?.map((l) => (
                                <span key={l.location} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                                  {l.location}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 space-x-2">
                            <button onClick={() => openEditInsuranceModal(ins)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Edit</button>
                            <button onClick={() => handleInsuranceDelete(ins.id)} disabled={loadingId === ins.id} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">
                              {loadingId === ins.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {insurances.length === 0 && (
                        <tr key="no-insurances">
                          <td colSpan={4} className="p-4 text-center text-gray-500">
                            No insurances found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <InsuranceModal
                  isOpen={insuranceModalOpen}
                  onClose={closeAllModals}
                  editingInsurance={editingInsurance}
                  onSuccess={handleInsuranceSaveSuccess}
                />
              </div>
            )}

            {/* Banners */}
            {activeView === "banners" && (
              <div className="space-y-4">
                <div className="flex justify-between items-start pt-2 px-1">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-2xl font-bold text-gray-800">Banners</h2>
                      {!isRefreshing && banners.length > 0 && (
                        <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">
                          {banners.length}
                        </span>
                      )}
                    </div>

                    {selectedBannerIds.size > 0 && (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                        <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                          {selectedBannerIds.size} selected
                        </span>
                        <button
                          onClick={handleBulkBannerDelete}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 cursor-pointer shadow-sm transition-colors"
                        >
                          Bulk Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={openAddBannerModal}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold shadow-sm cursor-pointer"
                  >
                    + Add Banner
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border border-gray-200">
                  <table className="w-full text-left border-collapse border border-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-20">
                      <tr>
                        <th className="p-2 border border-gray-200">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                            checked={selectedBannerIds.size === banners.length && banners.length > 0}
                            onChange={toggleSelectAllBanners}
                          />
                        </th>
                        <th className="p-2">Image</th>
                        <th className="p-2">Link</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banners.map((banner) => (
                        <tr key={banner.id || `banner-${banner.link}`} className="border-t hover:bg-gray-50/50 transition-colors">
                          <td className="p-2 border border-gray-200">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                              checked={selectedBannerIds.has(banner.id)}
                              onChange={() => toggleSelectBanner(banner.id)}
                            />
                          </td>
                          <td className="p-2">
                            {banner.image ? (
                              <img src={banner.image.startsWith("http") ? banner.image : `${BANNER_URL_PREFIX}${banner.image}`} alt={'Banner image'} className="w-48 h-auto object-contain rounded" />
                            ) : (
                              <span className="text-gray-400">No Image</span>
                            )}
                          </td>
                          <td className="p-2">{banner.link}</td>
                          <td className="p-2 space-x-2">
                            <button onClick={() => openEditBannerModal(banner)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Edit</button>
                            <button onClick={() => handleBannerDelete(banner.id)} disabled={loadingId === banner.id} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">
                              {loadingId === banner.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {banners.length === 0 && (
                        <tr key="no-banners">
                          <td colSpan={4} className="p-4 text-center text-gray-500">No banners found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <BannerModal
                  isOpen={bannerModalOpen}
                  onClose={closeAllModals}
                  editingBanner={editingBanner}
                  onSuccess={handleBannerSaveSuccess}
                />
              </div>
            )}

            {/* Deals */}
            {activeView === "deals" && (
              <div className="space-y-4">
                <div className="flex justify-between items-start pt-2 px-1">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-2xl font-bold text-gray-800">Deals of the Day</h2>
                      {!isRefreshing && deals.length > 0 && (
                        <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">
                          {deals.length}
                        </span>
                      )}
                    </div>

                    {selectedDealIds.size > 0 && (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                        <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                          {selectedDealIds.size} selected
                        </span>
                        <button
                          onClick={handleBulkDealDelete}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 cursor-pointer shadow-sm transition-colors"
                        >
                          Bulk Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={openAddDealModal}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold shadow-sm cursor-pointer"
                  >
                    + Add Deal
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border border-gray-200">
                  <table className="w-full text-left border-collapse border border-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-20">
                      <tr>
                        <th className="p-2 border border-gray-200">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                            checked={selectedDealIds.size === deals.length && deals.length > 0}
                            onChange={toggleSelectAllDeals}
                          />
                        </th>
                        <th className="p-2">Image</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">Discount</th>
                        <th className="p-2">Tagline</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((deal) => (
                        <tr key={deal.id || `deal-${deal.title}`} className="border-t hover:bg-gray-50/50 transition-colors">
                          <td className="p-2 border border-gray-200">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                              checked={selectedDealIds.has(deal.id)}
                              onChange={() => toggleSelectDeal(deal.id)}
                            />
                          </td>
                          <td className="p-2">
                            {deal.image ? (
                              <img src={deal.image.startsWith("http") ? deal.image : `${DEAL_URL_PREFIX}${deal.image}`} alt={'Deal image'} className="w-24 h-auto object-contain rounded" />
                            ) : (
                              <span className="text-gray-400">No Image</span>
                            )}
                          </td>
                          <td className="p-2">{deal.title}</td>
                          <td className="p-2">{deal.discount}</td>
                          <td className="p-2">{deal.tagline}</td>
                          <td className="p-2 space-x-2 whitespace-nowrap">
                            <button onClick={() => openEditDealModal(deal)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Edit</button>
                            <button onClick={() => handleDealDelete(deal.id)} disabled={loadingId === deal.id} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">
                              {loadingId === deal.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {deals.length === 0 && (
                        <tr key="no-deals">
                          <td colSpan={6} className="p-4 text-center text-gray-500">
                            No deals found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <DealModal
                  isOpen={dealModalOpen}
                  onClose={closeAllModals}
                  editingDeal={editingDeal}
                  onSuccess={handleDealSaveSuccess}
                />
              </div>
            )}

            {/* Doctors */}
            {activeView === "doctors" && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Doctors</h2>
                  <button
                    onClick={openAddDoctorModal}
                    className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-700"
                  >
                    + Add Doctor
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Image</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Specialty</th>
                        <th className="p-2">Locations</th>
                        <th className="p-2">Bio</th>
                        <th className="p-2">Booking Type</th>
                        <th className="p-2">Availability</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doc) => (
                        <tr key={doc.id || `doc-${doc.name}`} className="border-t">
                          <td className="p-2">
                            {doc.image ? (
                              <img src={doc.image} alt={doc.name || 'Doctor image'} className="w-16 h-16 object-cover rounded" />
                            ) : (
                              <span className="text-gray-400">No Image</span>
                            )}
                          </td>
                          <td className="p-2">{doc.name}</td>
                          <td className="p-2">{doc.specialty}</td>
                          <td className="p-2 max-w-xs">{doc.location?.join(", ")}</td>
                          <td className="p-2 max-w-xs truncate">{doc.bio}</td>
                          <td className="p-2">{doc.booking_type}</td>
                          <td className="p-2">{doc.availability && doc.availability.length > 0 ? 'Yes' : 'No'}</td>
                          <td className="p-2 space-x-2">
                            <button onClick={() => openEditDoctorModal(doc)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Edit</button>
                            <button onClick={() => handleDoctorDelete(doc.id)} disabled={loadingId === doc.id} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">
                              {loadingId === doc.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {doctors.length === 0 && (
                        <tr key="no-doctors">
                          <td colSpan={8} className="p-4 text-center text-gray-500">
                            No doctors found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <DoctorModal
                  isOpen={doctorModalOpen}
                  onClose={closeAllModals}
                  editingDoctor={editingDoctor}
                  onSuccess={handleDoctorSaveSuccess}
                />
              </div>
            )}

            {/* Stories */}
            {activeView === "stories" && (
              <div className="space-y-4">
                <div className="flex justify-between items-start pt-2 px-1">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-2xl font-bold text-gray-800">Manage Stories</h2>
                      {!isRefreshing && stories.length > 0 && (
                        <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">
                          {stories.length}
                        </span>
                      )}
                    </div>

                    {selectedStoryIds.size > 0 && (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                        <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                          {selectedStoryIds.size} selected
                        </span>
                        <button
                          onClick={handleBulkStoryDelete}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 cursor-pointer shadow-sm transition-colors"
                        >
                          Bulk Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <button onClick={openAddStoryModal} className="px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-700 cursor-pointer">+ Add Story</button>
                </div>
                <div className="bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border border-gray-200">
                  <table className="w-full text-left border-collapse border border-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-20">
                      <tr>
                        <th className="p-2 border border-gray-200">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                            checked={selectedStoryIds.size === stories.length && stories.length > 0}
                            onChange={toggleSelectAllStories}
                          />
                        </th>
                        <th className="p-2">Avatar</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Tag & Status</th>
                        <th className="p-2">Images</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stories.map((story) => (
                        <tr key={story.id || `story-${story.name}`} className="border-t hover:bg-gray-50/50 transition-colors">
                          <td className="p-2 border border-gray-200">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                              checked={selectedStoryIds.has(story.id)}
                              onChange={() => toggleSelectStory(story.id)}
                            />
                          </td>
                          <td className="p-2"><img src={story.avatar} className="w-10 h-10 rounded-full object-cover" /></td>
                          <td className="p-2">{story.name}</td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => toggleStoryVisibility(story, "show_tag")}
                                className="flex items-center gap-1 hover:opacity-70 transition-opacity cursor-pointer"
                              >
                                <span className={`text-xs font-bold uppercase ${story.show_tag === false ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{story.tag}</span>
                                {story.show_tag === false && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">Hidden</span>}
                              </button>
                              {story.website && (
                                <button
                                  onClick={() => toggleStoryVisibility(story, "show_website")}
                                  className="flex items-center gap-1 hover:opacity-70 transition-opacity cursor-pointer"
                                >
                                  <span className={`text-[10px] ${story.show_website === false ? 'text-gray-400' : 'text-blue-600'}`}>Website Link</span>
                                  <span className={`text-[9px] px-1 rounded ${story.show_website === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{story.show_website === false ? 'Hidden' : 'Visible'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {story.images?.map((url, i) => {
                                const isVideo = url.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => setPreviewMedia(url)}
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                  >
                                    {isVideo ? (
                                      <video
                                        src={url}
                                        className="w-10 h-10 rounded object-cover border bg-gray-100"
                                      />
                                    ) : (
                                      <img
                                        src={url}
                                        className="w-10 h-10 rounded object-cover border"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-2 space-x-2">
                            <button 
                              onClick={() => viewStats('story', story.id, story.name)} 
                              disabled={loadingId === story.id + 'story'}
                              className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {loadingId === story.id + 'story' ? <Spinner className="h-3 w-3" /> : "Stats"}
                            </button>
                            <button onClick={() => openEditStoryModal(story)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Edit</button>
                            <button onClick={() => handleStoryDelete(story.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {stories.length === 0 && (
                        <tr key="no-stories">
                          <td colSpan={5} className="p-4 text-center text-gray-500">
                            No stories for now
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <StoryModal
                  isOpen={storyModalOpen}
                  onClose={closeAllModals}
                  editingStory={editingStory}
                  onSuccess={handleStorySaveSuccess}
                />
              </div>
            )}

            {/* Posts */}
            {activeView === "posts" && (
              <div className="space-y-4">
                <div className="flex justify-between items-start pt-2 px-1">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-2xl font-bold text-gray-800">Manage Posts</h2>
                      {!isRefreshing && posts.length > 0 && (
                        <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">
                          {posts.length}
                        </span>
                      )}
                    </div>
                    {selectedPostIds.size > 0 && (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                        <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                          {selectedPostIds.size} selected
                        </span>
                        <button
                          onClick={handleBulkPostDelete}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 cursor-pointer shadow-sm transition-colors"
                        >
                          Bulk Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <button onClick={openAddPostModal} className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-700 cursor-pointer">+ Add Post</button>
                </div>
                <div className="bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border border-gray-200">
                  <table className="w-full text-left border-collapse border border-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-20">
                      <tr>
                        <th className="p-2 border border-gray-200">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                            checked={selectedPostIds.size === posts.length && posts.length > 0}
                            onChange={toggleSelectAllPosts}
                          />
                        </th>
                        <th className="p-2">Image</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">Links Visibility</th>
                        <th className="p-2">Caption</th>
                        <th className="p-2">Likes</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr key={post.id || `post-${post.title}`} className="border-t hover:bg-gray-50/50 transition-colors">
                          <td className="p-2 border border-gray-200">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                              checked={selectedPostIds.has(post.id)}
                              onChange={() => toggleSelectPost(post.id)}
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {post.images?.map((url, i) => {
                                const isVideo = url.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => setPreviewMedia(url)}
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                  >
                                    {isVideo ? (
                                      <video
                                        src={url}
                                        className="w-12 h-12 rounded object-cover border bg-gray-100"
                                      />
                                    ) : (
                                      <img
                                        src={url}
                                        className="w-12 h-12 rounded object-cover border"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-2 font-bold">{post.title}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              {post.website && (
                                <button
                                  onClick={() => togglePostVisibility(post, "show_website")}
                                  title="Toggle Website visibility"
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hover:scale-105 transition-transform cursor-pointer ${post.show_website === false ? 'bg-red-50 text-red-500 border-red-200 line-through' : 'bg-green-50 text-green-600 border-green-200'}`}
                                >
                                  WEB
                                </button>
                              )}
                              {post.whatsapp && (
                                <button
                                  onClick={() => togglePostVisibility(post, "show_whatsapp")}
                                  title="Toggle WhatsApp visibility"
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hover:scale-105 transition-transform cursor-pointer ${post.show_whatsapp === false ? 'bg-red-50 text-red-500 border-red-200 line-through' : 'bg-green-50 text-green-600 border-green-200'}`}
                                >
                                  WA
                                </button>
                              )}
                              {post.instagram && (
                                <button
                                  onClick={() => togglePostVisibility(post, "show_instagram")}
                                  title="Toggle Instagram visibility"
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hover:scale-105 transition-transform cursor-pointer ${post.show_instagram === false ? 'bg-red-50 text-red-500 border-red-200 line-through' : 'bg-green-50 text-green-600 border-green-200'}`}
                                >
                                  IG
                                </button>
                              )}
                              {post.twitter && (
                                <button
                                  onClick={() => togglePostVisibility(post, "show_twitter")}
                                  title="Toggle X visibility"
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hover:scale-105 transition-transform cursor-pointer ${post.show_twitter === false ? 'bg-red-50 text-red-500 border-red-200 line-through' : 'bg-green-50 text-green-600 border-green-200'}`}
                                >
                                  X
                                </button>
                              )}
                              {!post.website && !post.whatsapp && !post.instagram && !post.twitter && (
                                <span className="text-[10px] text-gray-400 italic">No links</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 truncate max-w-xs">{post.caption}</td>
                          <td className="p-2">{post.likes}</td>
                          <td className="p-2 space-x-2 whitespace-nowrap">
                            <button 
                              onClick={() => viewStats('post-likes', post.id, post.title)} 
                              disabled={loadingId === post.id + 'post-likes'}
                              className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {loadingId === post.id + 'post-likes' ? <Spinner className="h-3 w-3" /> : "Likes"}
                            </button>
                            <button 
                              onClick={() => viewStats('post-views', post.id, post.title)} 
                              disabled={loadingId === post.id + 'post-views'}
                              className="bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {loadingId === post.id + 'post-views' ? <Spinner className="h-3 w-3" /> : "Views"}
                            </button>
                            <button onClick={() => openEditPostModal(post)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Edit</button>
                            <button onClick={() => handlePostDelete(post.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {posts.length === 0 && (
                        <tr key="no-posts">
                          <td colSpan={6} className="p-4 text-center text-gray-500">
                            No posts for now
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <PostModal
                  isOpen={postModalOpen}
                  onClose={closeAllModals}
                  editingPost={editingPost}
                  onSuccess={handlePostSaveSuccess}
                />
              </div>
            )}
          </>
        )}

        {/* Confirm Modal (App-wide) */}
        {confirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`px-6 py-2 text-white rounded-lg transition-colors text-sm font-bold cursor-pointer shadow-lg ${
                  confirmModal.type === 'delete' || confirmModal.type === 'logout' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Stats Modal */}
      {statsModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-110" onClick={() => { setStatsModal(p => ({ ...p, isOpen: false })); setStatsSearchQuery(""); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">{statsModal.title}</h2>
              <button 
                onClick={() => { setStatsModal(p => ({ ...p, isOpen: false })); setStatsSearchQuery(""); }} 
                className="text-2xl bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-4 bg-gray-50 border-b flex flex-col gap-4">
              <div className="flex justify-between items-center">
                {statsModal.extraInfo && (
                  <p className="text-sm font-semibold text-gray-700">{statsModal.extraInfo}</p>
                )}
                <button
                  onClick={() => exportStatsToCSV(
                    statsModal.data.filter(row => 
                      (row.fullname || "").toLowerCase().includes(statsSearchQuery.toLowerCase()) ||
                      (row.whatsapp_number || "").toLowerCase().includes(statsSearchQuery.toLowerCase())
                    ),
                    statsModal.title
                  )}
                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
                >
                  📥 Export to CSV
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by username or phone number..."
                  value={statsSearchQuery}
                  onChange={(e) => setStatsSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">WhatsApp</th>
                    <th className="p-2 text-left">Interaction & Date</th>
                  </tr>
                </thead>
                <tbody>
                  {statsModal.data
                    .filter(row => 
                      (row.fullname || "").toLowerCase().includes(statsSearchQuery.toLowerCase()) ||
                      (row.whatsapp_number || "").toLowerCase().includes(statsSearchQuery.toLowerCase())
                    )
                    .map((row, i) => (
                    <tr key={row.id || `stat-${i}`} className="border-t">
                      <td className="p-2">{row.fullname}</td>
                      <td className="p-2">{row.whatsapp_number}</td>
                      <td className="p-2">
                        {row.image_index !== undefined ? `Viewed Image #${row.image_index + 1}` : 'Liked Post'}
                        <div className="text-[10px] text-gray-400">{new Date(row.created_at).toLocaleString()}</div>
                      </td>
                    </tr>
                  ))}
                  {statsModal.data.length === 0 ? (
                    <tr key="no-stats"><td colSpan={3} className="p-10 text-center text-gray-400">No interactions yet</td></tr>
                  ) : statsModal.data.filter(row => 
                      (row.fullname || "").toLowerCase().includes(statsSearchQuery.toLowerCase()) ||
                      (row.whatsapp_number || "").toLowerCase().includes(statsSearchQuery.toLowerCase())
                    ).length === 0 && (
                    <tr key="no-results">
                      <td colSpan={3} className="p-10 text-center text-gray-400">No results matching "{statsSearchQuery}"</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Overlay */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-100 flex items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div className="relative max-w-5xl max-h-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-12 right-0 text-white text-4xl hover:text-gray-300 transition-colors"
            >
              &times;
            </button>
            {previewMedia.match(/\.(mp4|mov|avi|mkv|webm)$/i) ? (
              <video
                src={previewMedia}
                controls
                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                autoPlay
              />
            ) : (
              <img
                src={previewMedia}
                alt="Full size preview"
                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
