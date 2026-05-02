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
import StoryModal from "../../components/StoryModal";
import PostModal from "../../components/PostModal";
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
};

type EpRewards = {
  ep_story_view: string;
  ep_post_view: string;
  ep_post_like: string;
  story_duration: string;
  show_add_to_cart_button: boolean;
} & ButtonSettings;

const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [applicationType, setApplicationType] = useState<"doctor" | "pharmacy" | "hospital" | "insurance" | null>(null);
  const [epRewards, setEpRewards] = useState({
    ep_story_view: "500",
    ep_post_view: "300",
    ep_post_like: "200",
    story_duration: "45000",
    show_add_to_cart_button: true, // Default to true
    show_product_cta_button: true,
    show_doctor_cta_button: true,
    show_hospital_cta_button: true,
    show_insurance_cta_button: true,
    show_pharmacy_cta_button: true,
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
  const [statsModal, setStatsModal] = useState<{ isOpen: boolean; title: string; data: any[] }>({ isOpen: false, title: "", data: [] });
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
        setEpRewards({
          ep_story_view: (data.ep_story_view ?? "500").toString(),
          ep_post_view: (data.ep_post_view ?? "300").toString(),
          ep_post_like: (data.ep_post_like ?? "200").toString(),
          story_duration: (data.story_duration ?? "45000").toString(),
          show_add_to_cart_button: data.show_add_to_cart_button !== false,
          show_product_cta_button: data.show_call_car_button_product !== false,
          show_doctor_cta_button: data.show_call_car_button_doctor !== false,
          show_hospital_cta_button: data.show_call_car_button_hospital !== false,
          show_insurance_cta_button: data.show_call_car_button_insurance !== false,
          show_pharmacy_cta_button: data.show_call_car_button_pharmacy !== false,
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

    const ctaButtonKeys = [
      "show_product_cta_button",
      "show_doctor_cta_button",
      "show_hospital_cta_button",
      "show_insurance_cta_button",
      "show_pharmacy_cta_button"
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
  const handleUpdateThreshold = async () => {
    const val = parseInt(newThresholdInput);
    if (isNaN(val) || val < 0) return toast.error("Please enter a valid non-negative number");

    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/settings/min-ep-required", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: val }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Engagement points threshold updated!");
      fetchEpThreshold();
    } catch (err) {
      toast.error("Error updating threshold");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchLeaderboard = () => fetchData("/api/admin/leaderboard", setLeaderboard);

  const fetchPosts = () =>
    fetchData("/api/admin/users?type=posts", setPosts, (data) =>
      (Array.isArray(data) ? data : []).map(mapPost)
    );

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

  async function handleSignOut() {
    if (!confirm("Are you sure you want to sign out?")) return;
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout");
      router.push("/admin/login");
    } catch (error) {
      console.error("Failed to sign out", error);
      setIsSigningOut(false);
    }
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
    fetchCategories();
    closeAllModals();
  }

  async function handleCategoryDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete category");

      fetchCategories();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setLoadingId(null);
    }
  }

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
    fetchPharmacies();
    closeAllModals();
  }

  async function handlePharmacyDelete(id: string) {
    if (!confirm("Delete this pharmacy?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/pharmacies?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete pharmacy");

      fetchPharmacies();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete pharmacy");
    } finally {
      setLoadingId(null);
    }
  }

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
    fetchHospitals();
    closeAllModals();
  }

  async function handleHospitalDelete(id: string) {
    if (!confirm("Delete this hospital?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/hospitals?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete hospital");
      fetchHospitals();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete hospital");
    } finally {
      setLoadingId(null);
    }
  }

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
    fetchInsurances();
    closeAllModals();
  }

  async function handleInsuranceDelete(id: string) {
    if (!confirm("Delete this insurance?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/insurances?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to delete insurance");
      fetchInsurances();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : "Failed to delete insurance"
      );
    } finally {
      setLoadingId(null);
    }
  }

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
    fetchBanners();
    closeAllModals();
  }

  async function handleBannerDelete(id: string) {
    if (!confirm("Delete this banner?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/banners?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to delete banner");
      fetchBanners();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : "Failed to delete banner"
      );
    } finally {
      setLoadingId(null);
    }
  }

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

  function handleDealSaveSuccess() {
    fetchDeals();
    closeAllModals();
  }

  async function handleDealDelete(id: string) {
    if (!confirm("Delete this deal?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/deals?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to delete deal");
      fetchDeals();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : "Failed to delete deal"
      );
    } finally {
      setLoadingId(null);
    }
  }

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
    fetchDoctors();
    closeAllModals();
  }

  async function handleDoctorDelete(id: string) {
    if (!confirm("Delete this doctor?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/doctors?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to delete doctor");
      fetchDoctors();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete doctor");
    } finally {
      setLoadingId(null);
    }
  }

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
    fetchMedicines();
    closeAllModals();
  }

  async function handleMedicineDelete(id: string) {
    if (!confirm("Delete this medicine?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/medicines?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to delete medicine");
      fetchMedicines();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete medicine");
    } finally {
      setLoadingId(null);
    }
  }

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
    fetchStories();
    closeAllModals();
  }

  async function handleStoryDelete(id: string) {
    if (!confirm("Delete this story?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/stories?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete story");
      fetchStories();
    } catch (err) {
      console.error(err);
      alert("Failed to delete story");
    } finally {
      setLoadingId(null);
    }
  }

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
    fetchPosts();
    closeAllModals();
  }

  async function handlePostDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      fetchPosts();
    } catch (err) {
      console.error(err);
      alert("Failed to delete post");
    } finally {
      setLoadingId(null);
    }
  }

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
  async function handleReviewDelete(id: string) {
    if (!confirm("Delete this review?")) return;
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
    let url = "";
    if (type === 'story') url = `/api/admin/stats/story/${id}`;
    else if (type === 'post-likes') url = `/api/admin/stats/post/${id}/likes`;
    else url = `/api/admin/stats/post/${id}/views`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      setStatsModal({
        isOpen: true,
        title: `Interactions: ${title}`,
        data: Array.isArray(data) ? data : []
      });
    } catch (e) {
      toast.error("Failed to fetch stats");
    }
  }

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
            onClick={() => handleNavClick("users")}
            className={`w-full text-left p-3 text-xs font-semibold bg-blue-500 text-white rounded-lg transition-all ${activeView === 'users' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Users
          </button>
          <button
            onClick={() => handleNavClick("orders")}
            className={`w-full text-left p-3 text-xs font-semibold bg-gray-500 text-white rounded-lg transition-all ${activeView === 'orders' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Orders
          </button>
          <button
            onClick={() => handleNavClick("applications", "doctor")}
            className={`w-full text-left p-3 text-xs font-semibold bg-pink-500 text-white rounded-lg transition-all ${activeView === 'applications' && applicationType === 'doctor' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Doctor Applications
          </button>
          <button
            onClick={() => handleNavClick("applications", "pharmacy")}
            className={`w-full text-left p-3 text-xs font-semibold bg-purple-500 text-white rounded-lg transition-all ${activeView === 'applications' && applicationType === 'pharmacy' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Pharma Applications
          </button>
          <button
            onClick={() => handleNavClick("applications", "hospital")}
            className={`w-full text-left p-3 text-xs font-semibold bg-green-500 text-white rounded-lg transition-all ${activeView === 'applications' && applicationType === 'hospital' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Hospitals Applications
          </button>
          <button
            onClick={() => handleNavClick("applications", "insurance")}
            className={`w-full text-left p-3 text-xs font-semibold bg-teal-500 text-white rounded-lg transition-all ${activeView === 'applications' && applicationType === 'insurance' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Insu Applications
          </button>
          <button
            onClick={() => handleNavClick("doctor-bookings")}
            className={`w-full text-left p-3 text-xs font-semibold bg-fuchsia-500 text-white rounded-lg transition-all ${activeView === 'doctor-bookings' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Doctor Bookings
          </button>
          <button
            onClick={() => handleNavClick("hospital-bookings")}
            className={`w-full text-left p-3 text-xs font-semibold bg-emerald-500 text-white rounded-lg transition-all ${activeView === 'hospital-bookings' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Hospital Bookings
          </button>
          <button
            onClick={() => handleNavClick("bus")}
            className={`w-full text-left p-3 text-xs font-semibold bg-slate-600 text-white rounded-lg transition-all ${activeView === 'bus' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Bus
          </button>
          <button
            onClick={() => handleNavClick("bus-bookings")}
            className={`w-full text-left p-3 text-xs font-semibold bg-zinc-600 text-white rounded-lg transition-all ${activeView === 'bus-bookings' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Bus Bookings
          </button>
          <button
            onClick={() => handleNavClick("service-fees")}
            className={`w-full text-left p-3 text-xs font-semibold bg-cyan-600 text-white rounded-lg transition-all ${activeView === 'service-fees' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Service Fees
          </button>
          <button
            onClick={() => handleNavClick("ep-threshold")}
            className={`w-full text-left p-3 text-xs font-semibold bg-violet-600 text-white rounded-lg transition-all ${activeView === 'ep-threshold' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage EP Threshold
          </button>
          <button
            onClick={() => handleNavClick("engagement-points")}
            className={`w-full text-left p-3 text-xs font-semibold bg-emerald-600 text-white rounded-lg transition-all ${activeView === 'engagement-points' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage EP Rewards
          </button>
          <button
            onClick={() => handleNavClick("manage-buttons")}
            className={`w-full text-left p-3 text-xs font-semibold bg-blue-800 text-white rounded-lg transition-all ${activeView === 'manage-buttons' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Buttons
          </button>
          <button
            onClick={() => handleNavClick("stock")}
            className={`w-full text-left p-3 text-xs font-semibold bg-indigo-500 text-white rounded-lg transition-all ${activeView === "stock"
              ? "ring-2 ring-offset-2 ring-black"
              : ""
              }`}
          >
            Manage Stock
          </button>
          <button
            onClick={() => handleNavClick("categories")}
            className={`w-full text-left p-3 text-xs font-semibold bg-yellow-500 text-white rounded-lg transition-all ${activeView === 'categories' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Categories
          </button>
          <button
            onClick={() => handleNavClick("reviews")}
            className={`w-full text-left p-3 text-xs font-semibold bg-yellow-600 text-white rounded-lg transition-all ${activeView === 'reviews' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Reviews
          </button>
          <button
            onClick={() => handleNavClick("banners")}
            className={`w-full text-left p-3 text-xs font-semibold bg-red-500 text-white rounded-lg transition-all ${activeView === 'banners' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Banners
          </button>
          <button
            onClick={() => handleNavClick("deals")}
            className={`w-full text-left p-3 text-xs font-semibold bg-orange-500 text-white rounded-lg transition-all ${activeView === 'deals' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Deals
          </button>
          <button
            onClick={() => handleNavClick("stories")}
            className={`w-full text-left p-3 text-xs font-semibold bg-rose-500 text-white rounded-lg transition-all ${activeView === 'stories' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Stories
          </button>
          <button
            onClick={() => handleNavClick("posts")}
            className={`w-full text-left p-3 text-xs font-semibold bg-sky-500 text-white rounded-lg transition-all ${activeView === 'posts' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Manage Posts
          </button>
          <button
            onClick={() => handleNavClick("leaderboard")}
            className={`w-full text-left p-3 text-xs font-semibold bg-amber-500 text-white rounded-lg transition-all ${activeView === 'leaderboard' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
          >
            Engagement Leaderboard
          </button>
        </nav>

        <div className="p-4 border-t">
          <button onClick={handleSignOut} disabled={isSigningOut} className="w-full p-3 text-center bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors text-xs font-semibold flex items-center justify-center gap-2">
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
                    <button onClick={() => setFeeModalOpen(true)} className="text-sm bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors shadow-sm font-semibold">+ Add New Fee</button>
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
                                  <button onClick={() => handleUpdateServiceFee(fee.id)} className="text-blue-600 font-bold hover:underline">
                                    {loadingId === fee.id ? "Saving..." : "Save"}
                                  </button>
                                  <button onClick={() => setEditingFeeId(null)} className="text-gray-500 hover:underline">Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingFeeId(rowId); setTempFeeValue(fee.fee.toString()); }}
                                  className="text-indigo-600 hover:underline"
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
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
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
                    <button onClick={() => setFeeModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={handleCreateServiceFee} className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-700 shadow-md">Create Fee</button>
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
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 uppercase mb-2 ml-1">Update Threshold Value</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={newThresholdInput}
                        onChange={(e) => setNewThresholdInput(e.target.value)}
                        className="flex-1 border-2 border-gray-200 rounded-xl p-4 text-lg font-semibold focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all shadow-inner bg-gray-50"
                        placeholder="e.g. 5000"
                      />
                      <button
                        onClick={handleUpdateThreshold}
                        disabled={isRefreshing}
                        className="bg-violet-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-violet-700 active:scale-95 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isRefreshing ? <Spinner /> : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Engagement Points Rewards */}
            {activeView === "engagement-points" && (
              <div className="bg-white rounded-lg shadow p-8 max-w-2xl mx-auto border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Manage Engagement Point Rewards</h2>
                  <button onClick={fetchEpRewards} className="text-sm text-emerald-600 font-bold hover:underline">Refresh Values</button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {[
                    { key: 'ep_story_view', label: 'Story View Reward', icon: '📱' },
                    { key: 'ep_post_view', label: 'Post View Reward', icon: '🖼️' },
                    { key: 'ep_post_like', label: 'Post Like Reward', icon: '❤️' },
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
                          className="bg-emerald-600 text-white px-6 rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-100 disabled:opacity-50 min-w-[120px]"
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
                        className="bg-emerald-600 text-white px-6 rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-100 disabled:opacity-50 min-w-[120px]"
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
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Categories</h2>
                  <button
                    onClick={openAddCategoryModal}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-700"
                  >
                    + Add Category
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Emoji</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Medicines</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat.id || `category-${cat.name}`} className="border-t">
                          <td className="p-2 text-xl">{cat.image}</td>
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
                              className="text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCategoryDelete(cat.id)}
                              disabled={loadingId === cat.id}
                              className="text-red-600 hover:underline"
                            >
                              {loadingId === cat.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr key="no-categories">
                          <td
                            colSpan={3}
                            className="p-4 text-center text-gray-500"
                          >
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
                  <button onClick={fetchReviews} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 transition-colors">Refresh</button>
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
                                    className="bg-blue-600 text-white px-2 py-1 rounded text-[10px]"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setReplyingToId(null)}
                                    className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-[10px]"
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
                                className="text-blue-600 hover:underline text-left"
                              >
                                {review.admin_reply ? "Edit Reply" : "Reply"}
                              </button>
                              <button
                                onClick={() => handleReviewDelete(review.id)}
                                disabled={loadingId === review.id}
                                className="text-red-600 hover:underline flex items-center gap-1"
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
                              className="text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handlePharmacyDelete(phar.id)}
                              disabled={loadingId === phar.id}
                              className="text-red-600 hover:underline"
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
                            <button onClick={() => openEditHospitalModal(hosp)} className="text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleHospitalDelete(hosp.id)} disabled={loadingId === hosp.id} className="text-red-600 hover:underline">
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
                            <button onClick={() => openEditInsuranceModal(ins)} className="text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleInsuranceDelete(ins.id)} disabled={loadingId === ins.id} className="text-red-600 hover:underline">
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
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Banners</h2>
                  <button
                    onClick={openAddBannerModal}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700"
                  >
                    + Add Banner
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Image</th>
                        <th className="p-2">Link</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banners.map((banner) => (
                        <tr key={banner.id || `banner-${banner.link}`} className="border-t">
                          <td className="p-2">
                            {banner.image ? (
                              <img src={banner.image.startsWith("http") ? banner.image : `${BANNER_URL_PREFIX}${banner.image}`} alt={'Banner image'} className="w-48 h-auto object-contain rounded" />
                            ) : (
                              <span className="text-gray-400">No Image</span>
                            )}
                          </td>
                          <td className="p-2">{banner.link}</td>
                          <td className="p-2 space-x-2">
                            <button onClick={() => openEditBannerModal(banner)} className="text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleBannerDelete(banner.id)} disabled={loadingId === banner.id} className="text-red-600 hover:underline">
                              {loadingId === banner.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {banners.length === 0 && (
                        <tr key="no-banners">
                          <td colSpan={3} className="p-4 text-center text-gray-500">
                            No banners found
                          </td>
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
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Deals of the Day</h2>
                  <button
                    onClick={openAddDealModal}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-700"
                  >
                    + Add Deal
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Image</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">Discount</th>
                        <th className="p-2">Tagline</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((deal) => (
                        <tr key={deal.id || `deal-${deal.title}`} className="border-t">
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
                          <td className="p-2 space-x-2">
                            <button onClick={() => openEditDealModal(deal)} className="text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleDealDelete(deal.id)} disabled={loadingId === deal.id} className="text-red-600 hover:underline">
                              {loadingId === deal.id ? <Spinner className="h-4 w-4" /> : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {deals.length === 0 && (
                        <tr key="no-deals">
                          <td colSpan={5} className="p-4 text-center text-gray-500">
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
                            <button onClick={() => openEditDoctorModal(doc)} className="text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleDoctorDelete(doc.id)} disabled={loadingId === doc.id} className="text-red-600 hover:underline">
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
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Manage Stories</h2>
                  <button onClick={openAddStoryModal} className="px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-700">+ Add Story</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2">Avatar</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Tag & Status</th>
                        <th className="p-2">Images</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stories.map((story) => (
                        <tr key={story.id || `story-${story.name}`} className="border-t">
                          <td className="p-2"><img src={story.avatar} className="w-10 h-10 rounded-full object-cover" /></td>
                          <td className="p-2">{story.name}</td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => toggleStoryVisibility(story, "show_tag")}
                                className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                              >
                                <span className={`text-xs font-bold uppercase ${story.show_tag === false ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{story.tag}</span>
                                {story.show_tag === false && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">Hidden</span>}
                              </button>
                              {story.website && (
                                <button
                                  onClick={() => toggleStoryVisibility(story, "show_website")}
                                  className="flex items-center gap-1 hover:opacity-70 transition-opacity"
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
                                    className="hover:opacity-80 transition-opacity"
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
                            <button onClick={() => viewStats('story', story.id, story.name)} className="text-green-600 hover:underline">Stats</button>
                            <button onClick={() => openEditStoryModal(story)} className="text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleStoryDelete(story.id)} className="text-red-600 hover:underline">Delete</button>
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
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Manage Posts</h2>
                  <button onClick={openAddPostModal} className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-700">+ Add Post</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
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
                        <tr key={post.id || `post-${post.title}`} className="border-t">
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {post.images?.map((url, i) => {
                                const isVideo = url.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => setPreviewMedia(url)}
                                    className="hover:opacity-80 transition-opacity"
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
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hover:scale-105 transition-transform ${post.show_website === false ? 'bg-red-50 text-red-500 border-red-200 line-through' : 'bg-green-50 text-green-600 border-green-200'}`}
                                >
                                  WEB
                                </button>
                              )}
                              {post.whatsapp && (
                                <button
                                  onClick={() => togglePostVisibility(post, "show_whatsapp")}
                                  title="Toggle WhatsApp visibility"
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hover:scale-105 transition-transform ${post.show_whatsapp === false ? 'bg-red-50 text-red-500 border-red-200 line-through' : 'bg-green-50 text-green-600 border-green-200'}`}
                                >
                                  WA
                                </button>
                              )}
                              {post.instagram && (
                                <button
                                  onClick={() => togglePostVisibility(post, "show_instagram")}
                                  title="Toggle Instagram visibility"
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hover:scale-105 transition-transform ${post.show_instagram === false ? 'bg-red-50 text-red-500 border-red-200 line-through' : 'bg-green-50 text-green-600 border-green-200'}`}
                                >
                                  IG
                                </button>
                              )}
                              {post.twitter && (
                                <button
                                  onClick={() => togglePostVisibility(post, "show_twitter")}
                                  title="Toggle X visibility"
                                  className={`text-[9px] px-1.5 py-0.5 rounded border font-medium hover:scale-105 transition-transform ${post.show_twitter === false ? 'bg-red-50 text-red-500 border-red-200 line-through' : 'bg-green-50 text-green-600 border-green-200'}`}
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
                          <td className="p-2 space-x-2">
                            <button onClick={() => viewStats('post-likes', post.id, post.title)} className="text-green-600 hover:underline">Likes</button>
                            <button onClick={() => viewStats('post-views', post.id, post.title)} className="text-purple-600 hover:underline">Views</button>
                            <button onClick={() => openEditPostModal(post)} className="text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handlePostDelete(post.id)} className="text-red-600 hover:underline">Delete</button>
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
      </main>

      {/* Stats Modal */}
      {statsModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-110" onClick={() => setStatsModal(p => ({ ...p, isOpen: false }))}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">{statsModal.title}</h2>
              <button onClick={() => setStatsModal(p => ({ ...p, isOpen: false }))} className="text-2xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">WhatsApp</th>
                    <th className="p-2 text-left">Interaction</th>
                  </tr>
                </thead>
                <tbody>
                  {statsModal.data.map((row, i) => (
                    <tr key={row.id || `stat-${i}`} className="border-t">
                      <td className="p-2">{row.fullname}</td>
                      <td className="p-2">{row.whatsapp_number}</td>
                      <td className="p-2">
                        {row.image_index !== undefined ? `Viewed Image #${row.image_index + 1}` : 'Liked Post'}
                        <div className="text-[10px] text-gray-400">{new Date(row.created_at).toLocaleString()}</div>
                      </td>
                    </tr>
                  ))}
                  {statsModal.data.length === 0 && (
                    <tr key="no-stats"><td colSpan={3} className="p-10 text-center text-gray-400">No interactions yet</td></tr>
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
