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

type LeaderboardEntry = {
  id: string;
  fullname: string;
  whatsapp_number: string;
  country: string;
  engagement_points: number;
};

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [applicationType, setApplicationType] = useState<"doctor" | "pharmacy" | "hospital" | "insurance" | null>(null);
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

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statsModal, setStatsModal] = useState<{ isOpen: boolean; title: string; data: any[] }>({ isOpen: false, title: "", data: [] });
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
        return { ...hosp, 
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
      else if (view === "leaderboard") refreshTasks.push(fetchLeaderboard());
      
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
      fetchPosts();
      fetchLeaderboard();
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
                                {filteredStock.map((med) => (
                                  <tr key={med.id} className="border-t">
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
