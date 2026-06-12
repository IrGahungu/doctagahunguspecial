"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { useLanguage } from "../../../context/LanguageContext";

type PharmacyApplication = {
  contact_email: string;
  contact_phone: string;
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  image?: string | null;
  opening_hours?: string | null;
  location?: string | null;
  views?: number;
  accepted_insurances?: string | null;
};

type StockItem = {
  id: string;
  name: string;
  price: number;
  original_price: number;
  quantity: number;
  in_stock: boolean;
  description?: string;
  category_id?: string;
  image?: string;
  insurances?: string[];
  categories?: {
    name: string;
  };
};

type Category = {
  id: string;
  name: string;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  image?: string;
  status?: string;
};

type Order = {
  id: string;
  created_at: string;
  status: "Pending" | "Accepted" | "Cancelled" | "Packed" | "On the way" | "Delivered";
  total_amount: number;
  items: OrderItem[];
  customer_name?: string;
};

interface DashboardClientProps {
  app: PharmacyApplication;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardClient({ app }: DashboardClientProps) {
  const { t, lang } = useLanguage();
  const [showStatus, setShowStatus] = useState(false);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (app.status === "approved") {
      setActiveTab("dashboard");
    } else {
      setActiveTab("status");
      setShowStatus(true);
    }
  }, [app.status]);

  const [activeTab, setActiveTab] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    whatsapp_number: "",
    country: "",
    payment_id: "",
    image: "",
    password: "",
    confirmPassword: "",
    contact_email: "",
    contact_phone: "",
    contact_office: "",
    contact_website: "",
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [openingHours, setOpeningHours] = useState<{ day: string; open: string; close: string; isClosed: boolean; is24Hours?: boolean }[]>([]);
  const [location, setlocation] = useState<{ city: string; address: string; latitude: string; longitude: string; phone: string }[]>([]);
  const [insurancesList, setInsurancesList] = useState<string[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [stockImageFile, setStockImageFile] = useState<File | null>(null);
  const [stockForm, setStockForm] = useState({ 
    name: "", 
    price: "", 
    original_price: "", 
    quantity: "", 
    description: "", // Initialize as empty, will be set by useEffect
    category_id: "", 
    image: "", 
    insurances: [] as string[] 
  });
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [orderStartDate, setOrderStartDate] = useState("");
  const [orderEndDate, setOrderEndDate] = useState("");
  const [dashboardStats, setDashboardStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalRevenue: 0,
    totalPendingOrders: 0,
    totalViews: 0,
  });
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
    
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingTab, setLoadingTab] = useState("");
  const [chartData, setChartData] = useState<{ date: string; revenue: number; orders: number; views: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showDeleteStockConfirm, setShowDeleteStockConfirm] = useState(false);
  const [stockToDeleteId, setStockToDeleteId] = useState<string | null>(null);
  const [isDeletingStock, setIsDeletingStock] = useState(false);

  // Set default description when language loads or changes.
  // Updates if the field is empty OR if it currently contains the default text from another language.
  useEffect(() => {
    const defaultTexts = [
      "Dosage to be given by the approved Doctor.",
      "Dose à être donner par le médecin agréé.",
      "Dosage à être donné par le médecin agréé."
    ];

    if (!editingStockId && (stockForm.description === "" || defaultTexts.includes(stockForm.description))) {
      setStockForm(prev => ({ ...prev, description: t.defaultMedicineDescription }));
    }
  }, [t.defaultMedicineDescription, editingStockId]);

  const statusColorMap = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-red-500",
  };

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pharmacy-images/${path}`;
  };

  const getStockImageUrl = (path: string | null | undefined) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medicine-images/${path}`;
  };

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/pharmacy/logout", { method: "POST" });
      router.refresh();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
      router.push("/login");
    }
  }

  async function handlePasswordUpdate() {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error(t.passwordsMatchError || "New passwords do not match");
        return;
      }
      if (!passwordForm.oldPassword) {
        toast.error(t.enterCurrentPassword || "Please enter your current password");
        return;
      }
      if (passwordForm.newPassword.length < 6) {
        toast.error(t.passwordTooShort || "New password must be at least 6 characters");
        return;
      }
  
      setIsSavingPassword(true);
      try {
        const res = await fetch(`/api/pharmacy/change-password`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "x-language": lang
          },
          body: JSON.stringify({
            id: app.id,
            oldPassword: passwordForm.oldPassword,
            newPassword: passwordForm.newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Map the specific backend error string to a localized translation key (case-insensitive)
          const backendError = data.error || "";
          const isIncorrect = backendError.toLowerCase().includes("incorrect") && backendError.toLowerCase().includes("password");
          
          const message = isIncorrect
            ? (t.incorrectCurrentPassword || backendError)
            : (backendError || t.updatePasswordFail || "Failed to update password");

          toast.error(message);
          return;
        }
      toast.success(t.updatePasswordSuccess || "Password updated successfully");
        setIsEditingPassword(false);
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } catch (e: any) {
        toast.error(e.message || t.updatePasswordError);
      } finally {
        setIsSavingPassword(false);
      }
    }

  const handleNavClick = (tab: string) => {
    if (tab !== "status" && app.status !== "approved") {
      toast.error(t.getApprovedFirst || "You need to be approved first");
      return;
    }
    if (activeTab === tab) {
      setRefreshKey((prev) => prev + 1);
    }
    setActiveTab(tab);
    setLoadingTab(tab);

    setTimeout(() => {
      if (tab === "status") setShowStatus(true);
      // Reset loading state after a short delay to allow UI to update
      setLoadingTab("");
    }, 500);
  };

  const fetchOrders = async () => {
    setIsOrdersLoading(true);
    try {
      const res = await fetch(`/api/pharmacy/orders?pharmacy_id=${app.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]); // Ensure orders is always an array
      }
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const updatePendingCount = async () => {
    if (!app.id) return;
    try {
      const res = await fetch(`/api/pharmacy/orders?pharmacy_id=${app.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const count = data.filter((o: Order) => o.status === "Pending").length;
        setPendingOrdersCount(count);
      }
    } catch (e) {
      console.error("Error fetching pending count", e);
    }
  };

  useEffect(() => {
    if (!app.id) return;

    const channel = supabase
      .channel('pharmacy-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        async (payload) => {
          const { data } = await supabase.from('stock').select('pharmacy_id').eq('id', payload.new.stock_id).maybeSingle();
          if (data && data.pharmacy_id === app.id) {
            toast.success(t.newOrderReceived, { duration: 5000 });
            updatePendingCount();
            if (activeTab === 'bookings') {
              fetchOrders();
            } 
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [app.id, activeTab]);

  useEffect(() => {
    updatePendingCount();
  }, [app.id]);

  useEffect(() => {
    if (activeTab === "dashboard" && app.id) {
      setIsDashboardLoading(true);
      Promise.all([
        fetch(`/api/pharmacy/orders?pharmacy_id=${app.id}`).then((res) => res.json()),
        fetch(`/api/pharmacy/stock?pharmacy_id=${app.id}`).then((res) => res.json()),
        fetch(`/api/pharmacy/apply?id=${app.id}`).then((res) => res.json()),
        fetch(`/api/pharmacy/views?pharmacy_id=${app.id}`).then((res) => res.json().catch(() => ({}))),
      ])
        .then(([ordersData, stockData, appData, viewsData]) => {
          // Process orders
          const ordersList = Array.isArray(ordersData) ? ordersData : [];
          const uniqueCustomers = new Set(ordersList.map((o: any) => o.customer_name || o.user_id)).size;
          const pendingOrders = ordersList.filter((o: any) => o.status === "Pending").length;

          // Calculate revenue based on Delivered orders for this pharmacy
          const revenue = ordersList
            .filter((o: any) => o.status === "Delivered")
            .reduce((acc: number, order: any) => {
              const orderTotal = order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
              return acc + orderTotal;
            }, 0);

          // Process stock
          const productsCount = Array.isArray(stockData) ? stockData.length : 0;

          // Process views
          const views = appData.views || 0;

          setDashboardStats({
            totalCustomers: uniqueCustomers,
            totalProducts: productsCount,
            totalRevenue: revenue,
            totalPendingOrders: pendingOrders,
            totalViews: views,
          });
          setRecentOrders(ordersList.slice(0, 5));

          // Prepare Chart Data (Last 7 Days)
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
          }).reverse();

          const dataMap = last7Days.reduce((acc, date) => {
            acc[date] = { date, revenue: 0, orders: 0, views: viewsData[date] || 0 };
            return acc;
          }, {} as any);

          ordersList.forEach((o: any) => {
            const d = new Date(o.created_at).toISOString().split('T')[0];
            if (dataMap[d]) {
              dataMap[d].orders += 1;
              if (o.status === 'Delivered') {
                const total = o.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
                dataMap[d].revenue += total;
              }
            }
          });
          setChartData(Object.values(dataMap));
        })
        .catch((err) => {
          console.error("Error fetching dashboard stats:", err);
          toast.error(t.failedToLoadDashboardStats);
        })
        .finally(() => setIsDashboardLoading(false));
    }
  }, [activeTab, app.id, refreshKey]);

  useEffect(() => {
    if (activeTab === "profile" && app.id) {
      setIsProfileLoading(true);
      fetch(`/api/pharmacy/apply?id=${app.id}`)
        .then((res) => res.json())
        .then((data) => {
          setProfileForm({
            name: data.name || "",
            email: data.email || "",
            whatsapp_number: data.whatsapp_number || "",
            country: data.country || "",
            payment_id: data.payment_id || "",
            image: data.image || "",
            password: "",
            confirmPassword: "",
            contact_email: data.contact_email || "",
            contact_phone: data.contact_phone || "",
            contact_office: data.contact_office || "",
            contact_website: data.contact_website || "",
          });

          let hours = [];
          try {
            if (data.opening_hours) hours = JSON.parse(data.opening_hours);
          } catch (e) { console.error("Error parsing hours", e); }
          
          if (!Array.isArray(hours) || hours.length === 0) {
            hours = [{ day: "", open: "", close: "", isClosed: false, is24Hours: false }];
          }
          setOpeningHours(hours);

          let locs = [];
          try {
            if (data.location) locs = JSON.parse(data.location);
          } catch (e) { console.error("Error parsing location", e); }
          
          if (!Array.isArray(locs) || locs.length === 0) {
            locs = [{ city: "", address: "", latitude: "", longitude: "", phone: "" }];
          }
          // Enforce single location
          if (locs.length > 1) locs = [locs[0]];
          setlocation(locs);

          let insurances = [];
          try {
            if (data.accepted_insurances) insurances = JSON.parse(data.accepted_insurances);
          } catch (e) { console.error("Error parsing insurances", e); }
          if (!Array.isArray(insurances)) insurances = [];
          setInsurancesList(insurances.map((i: string) => i.toUpperCase()));
        })
        .catch((err) => toast.error(t.failedToLoadProfile))
        .finally(() => setIsProfileLoading(false));
    }
  }, [activeTab, app.id, refreshKey]);

  useEffect(() => {
    if (activeTab === "availability" && app.id) {
      setIsStockLoading(true);
      Promise.all([
        fetch(`/api/pharmacy/stock?pharmacy_id=${app.id}`).then((res) => res.json()),
        fetch(`/api/categories`).then((res) => res.json()),
        fetch(`/api/pharmacy/apply?id=${app.id}`).then((res) => res.json())
      ])
        .then(([stockData, categoriesData, profileData]) => {
          if (Array.isArray(stockData)) setStockItems(stockData);
          if (Array.isArray(categoriesData)) setCategories(categoriesData);

          // Parse insurances from profileData to populate the dropdown options
          let insurances = [];
          try {
            if (profileData.accepted_insurances) insurances = JSON.parse(profileData.accepted_insurances);
          } catch (e) { console.error("Error parsing insurances", e); }
          if (!Array.isArray(insurances)) insurances = [];
          setInsurancesList(insurances.map((i: string) => i.toUpperCase()));
        })
        .catch((err) => toast.error(t.failedToLoadData))
        .finally(() => setIsStockLoading(false));
    }
  }, [activeTab, app.id, refreshKey]);

  useEffect(() => {
    if (activeTab === "bookings" && app.id) {
      fetchOrders();
    }
  }, [activeTab, app.id, refreshKey]);

  async function handleStatusUpdate(orderId: string, newStatus: string) {
    console.log(`Updating order ${orderId} to ${newStatus}`);
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch("/api/pharmacy/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus, pharmacy_id: app.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t.failedToUpdate);
        return;
      }

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id === orderId) {
            console.log("Updating local state for order:", order.id);
            // Update the top-level status for the dropdown and the status for each item locally
            const updatedItems = order.items.map((item: OrderItem) => ({ ...item, status: newStatus }));
            return { ...order, status: newStatus as any, items: updatedItems };
          }
          return order;
        })
      );
      toast.success(`Order marked as ${newStatus}`);
      updatePendingCount();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    setProfileForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  }

  function handleStockImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStockImageFile(file);
    setStockForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true);
  
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      toast.error(t.newPasswordsDoNotMatch);
      setIsSavingProfile(false);
      return;
    }
  
    const sanitizedOpeningHours = openingHours.map((h) => {
      if (h.is24Hours || h.isClosed) {
        return { ...h, open: "", close: "" };
      } 
      return h;
    });

    const updateData: any = { 
      ...profileForm, 
      id: app.id, 
      opening_hours: JSON.stringify(sanitizedOpeningHours),
      location: JSON.stringify(location),
      accepted_insurances: JSON.stringify(insurancesList),
    };

    if (!updateData.password) {
      delete (updateData as any).password; // Remove password if not being updated
    }
    delete (updateData as any).confirmPassword;

    const formData = new FormData();
    formData.append("id", app.id);
    formData.append("name", updateData.name);
    formData.append("email", updateData.email);
    formData.append("whatsapp_number", updateData.whatsapp_number);
    formData.append("country", updateData.country);
    formData.append("payment_id", updateData.payment_id);
    formData.append("contact_email", updateData.contact_email);
    formData.append("contact_phone", updateData.contact_phone);
    formData.append("contact_office", updateData.contact_office);
    formData.append("contact_website", updateData.contact_website);
    formData.append("opening_hours", updateData.opening_hours);
    formData.append("location", updateData.location);
    formData.append("accepted_insurances", updateData.accepted_insurances);
    if (profileImageFile) formData.append("image", profileImageFile);
    else if (updateData.image) formData.append("image", updateData.image);

    try {
      const res = await fetch(`/api/pharmacy/apply?id=${app.id}`, {
        method: "PUT",
        body: formData,
      });
      if (!res.ok) {
        toast.error(t.failedToUpdateProfile);
        return;
      }
      toast.success(t.profileUpdatedSuccessfully);
      router.refresh();
      setIsEditingProfile(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Error updating profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  const updateDay = (index: number, field: keyof typeof openingHours[0], value: any) => {
    const newHours = openingHours.map((h, i) => {
      if (i === index) {
        const updated = { ...h, [field]: value };
        if (field === "isClosed" && value === true) updated.is24Hours = false;
        if (field === "is24Hours" && value === true) updated.isClosed = false;
        return updated;
      }
      return h;
    });
    setOpeningHours(newHours);
  };

  const addOpeningHour = () => {
    setOpeningHours([...openingHours, { day: "", open: "", close: "", isClosed: false, is24Hours: false }]);
  };

  const removeOpeningHour = (index: number) => {
    setOpeningHours(openingHours.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof typeof location[0], value: string) => {
    const newlocation = location.map((loc, i) => {
      if (i === index) {
        if (field === "city" || field === "address") {
          return { ...loc, [field]: value.toUpperCase() };
        }
        return { ...loc, [field]: value };
      }
      return loc;
    });
    setlocation(newlocation);
  };

  const updateInsurance = (index: number, value: string) => {
    const newList = [...insurancesList];
    newList[index] = value.toUpperCase();
    setInsurancesList(newList);
  };

  const addInsurance = () => {
    setInsurancesList([...insurancesList, ""]);
  };

  const removeInsurance = (index: number) => {
    setInsurancesList(insurancesList.filter((_, i) => i !== index));
  };

  const handleCurrentLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast.error(t.geolocationNotSupported);
      return;
    }
    toast.loading(t.gettingLocation, { id: "geo" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation(index, "latitude", position.coords.latitude.toFixed(6));
        updateLocation(index, "longitude", position.coords.longitude.toFixed(6));
        toast.success(t.locationUpdated, { id: "geo" });
      },
      (error) => {
        console.error(error);
        toast.error(t.unableToRetrieveLocation, { id: "geo" });
      }
    );
  };

  const handlePasteCoordinates = async (index: number) => {
    try {
      const text = await navigator.clipboard.readText();
      // Remove parentheses and split by comma or whitespace
      const parts = text.replace(/[()]/g, '').split(/[, \t]+/).filter(p => p.trim() !== "");
      
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          setlocation((prev) => prev.map((loc, i) => {
            if (i === index) return { ...loc, latitude: lat.toString(), longitude: lng.toString() };
            return loc; 
          }));
          toast.success(t.coordinatesPasted);
          return;
        }
      }
      toast.error(t.invalidCoordinatesClipboard);
    } catch (err) {
      toast.error(t.unableToAccessClipboard);
    }
  };

  async function handleSaveStock() {
    if (!stockForm.name || !stockForm.price || !stockForm.category_id) {
      toast.error(t.namePriceCategoryRequired);
      return;
    }
    setIsAddingStock(true);
    console.log('[DashboardClient] Saving stock item:', stockForm.name);
    console.log('[DashboardClient] Selected Category ID:', stockForm.category_id);
    try {
      const url = editingStockId ? `/api/pharmacy/stock?id=${editingStockId}` : "/api/pharmacy/stock";
      const method = editingStockId ? "PUT" : "POST";

      const formData = new FormData();
      formData.append("name", stockForm.name);
      formData.append("price", stockForm.price);
      formData.append("original_price", stockForm.original_price);
      formData.append("quantity", stockForm.quantity);
      formData.append("description", stockForm.description);
      formData.append("category_id", stockForm.category_id);
      formData.append("pharmacy_id", app.id);
      formData.append("in_stock", String(Number(stockForm.quantity) > 0));
      formData.append("insurances", JSON.stringify(stockForm.insurances));
      
      if (editingStockId) formData.append("id", editingStockId);

      if (stockImageFile) formData.append("image", stockImageFile);
      else if (stockForm.image && !stockForm.image.startsWith("blob:")) formData.append("image", stockForm.image);

      const res = await fetch(url, {
        method: method,
        body: formData,
      });
      if (res.ok) {
        const savedItem = await res.json();
        if (editingStockId) {
          setStockItems((prev) => prev.map(item => item.id === editingStockId ? savedItem : item)); // Update existing item
          toast.success(t.stockItemUpdated);
        } else {
          setStockItems((prev) => [...prev, savedItem]); // Add new item
          toast.success(t.stockItemAdded);
        }
        setStockForm({ 
          name: "", 
          price: "", 
          original_price: "", 
          quantity: "", 
          description: t.defaultMedicineDescription,
          category_id: "", 
          image: "", 
          insurances: [] 
        });
        setStockImageFile(null);
        setEditingStockId(null);
      } else { 
        toast.error(t.failedToSaveItem);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Error saving item");
    } finally {
      setIsAddingStock(false);
    }
  }

  function handleEditStock(item: StockItem) {
    setStockForm({
      name: item.name,
      price: item.price.toString(),
      original_price: item.original_price.toString(),
      quantity: item.quantity.toString(),
      description: item.description || "",
      category_id: item.category_id || "",
      image: item.image || "",
      insurances: item.insurances || [],
    });
    setEditingStockId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setStockForm({ 
      name: "", 
      price: "", 
      original_price: "", 
      quantity: "", 
      description: t.defaultMedicineDescription,
      category_id: "", 
      image: "", 
      insurances: [] 
    });
    setEditingStockId(null);
    setStockImageFile(null);
  }

  function handleDeleteStock(id: string) {
    setStockToDeleteId(id);
    setShowDeleteStockConfirm(true);
  }

  async function confirmDeleteStock() {
    if (!stockToDeleteId) return;
    setIsDeletingStock(true);
    try {
      const res = await fetch(`/api/pharmacy/stock?id=${stockToDeleteId}`, { method: "DELETE" });
      if (res.ok) {
        setStockItems((prev) => prev.filter((item) => item.id !== stockToDeleteId)); // Remove deleted item
        toast.success(t.itemDeleted);
      } else { 
        toast.error(t.failedToDelete);
      }
    } catch (e) {
      toast.error("Failed to delete");
    } finally {
      setIsDeletingStock(false);
      setShowDeleteStockConfirm(false);
      setStockToDeleteId(null);
    }
  }

  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t.pleaseAllowPopupsToPrint);
      return;
    }

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">BIF ${item.price.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">BIF ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order #${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .pharmacy-name { font-size: 24px; font-weight: bold; color: #333; }
          .order-info { margin-bottom: 20px; }
          .order-info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; padding: 10px; background-color: #f8f9fa; border-bottom: 2px solid #ddd; }
          .total-section { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="pharmacy-name">${app.name}</div>
          <p>Order Receipt</p>
        </div>
        
        <div class="order-info">
          <p><strong>Order ID:</strong> #${order.id}</p>
          <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
          <p><strong>Customer:</strong> ${order.customer_name || 'Guest'}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-section">
          Total Amount: BIF ${totalAmount.toLocaleString()}
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${app.contact_phone || ''} | ${app.contact_email || ''}</p>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      String(order.id).toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(orderSearchQuery.toLowerCase()));

    const matchesStatus = orderStatusFilter === "All" || order.status === orderStatusFilter;

    let matchesDate = true;
    if (orderStartDate) {
      matchesDate = matchesDate && new Date(order.created_at) >= new Date(orderStartDate);
    }
    if (orderEndDate) {
      const end = new Date(orderEndDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(order.created_at) <= end;
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-white shadow-lg p-4 md:p-6 flex flex-col space-y-4 border-r border-gray-200 overflow-y-auto transition-all duration-300">
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="h-10 w-10 md:h-20 md:w-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shadow-sm mb-3 overflow-hidden transition-all duration-300">
            {app.image ? (
              <img src={getImageUrl(app.image)} alt={app.name} className="h-full w-full object-cover" />
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
                <span className="hidden md:block">{t.dashboard || "Dashboard"}</span>
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
                <span className="hidden md:block">{t.myStock || "My Stock"}</span>
              </>
            )}
          </button>
          {activeTab === "availability" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-orange-600 rounded-full"></div>}
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
                <span className="hidden md:block">{t.orders || "Orders"}</span>
                <span className="absolute -top-1 -right-1 md:top-1/2 md:-translate-y-1/2 md:right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                  {pendingOrdersCount}
                </span>
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
                <span className="hidden md:block">{t.myPharmacy || "My pharmacy"}</span>
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
                <span className="hidden md:block">{t.settings || "Settings"}</span>
              </>
            )}
          </button>
          {activeTab === "settings" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-gray-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("status")}
            disabled={loadingTab === "status"}
            className={`relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 disabled:bg-purple-400 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black ${activeTab === 'status' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
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
                <span className="hidden md:block">{t.status || "Status"}</span>
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
          <span className="hidden md:block">{t.logout || "Logout"}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-8 py-5">
          <h2 className="text-center text-xl font-semibold text-gray-800">
          {t.welcomeGreeting || "Greetings and welcome dear"} {app.name} {t.welcomeGreetingSuffix || "on Dr. Gahungu Platform."}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">

            {activeTab === "dashboard" && (
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">{t.dashboardOverview || "Dashboard Overview"}</h3>
                {isDashboardLoading ? (
                  <div className="text-center py-10">{t.loadingStats || "Loading stats..."}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">{t.totalCustomers || "Total Customers"}</h4>
                      <div className="text-2xl font-bold text-center text-gray-800">{dashboardStats.totalCustomers}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">{t.totalProducts || "Total Products"}</h4>
                      <div className="text-2xl font-bold text-center text-blue-600">{dashboardStats.totalProducts}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">{t.totalRevenue || "Total Revenue"}</h4>
                      <div className="text-2xl font-bold text-center text-green-600">
                        {dashboardStats.totalRevenue.toLocaleString()} <span className="text-xs text-gray-400">BIF</span>
                      </div>
                      <button
                        onClick={() => toast.success(t.withdrawSoon || "The team is implementing it for soon")}
                        disabled={dashboardStats.totalRevenue === 0}
                        className={`mt-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                          dashboardStats.totalRevenue > 0
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {t.withdraw || "Withdraw"}
                      </button>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">{t.totalPendingOrders || "Pending Orders"}</h4>
                      <div className="text-2xl font-bold text-center text-orange-500">{dashboardStats.totalPendingOrders}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h4 className="text-gray-500 text-[10px] text-center font-medium uppercase tracking-wider mb-1">{t.totalViews || "Total Views"}</h4>
                      <div className="text-2xl font-bold text-center text-indigo-600">{dashboardStats.totalViews}</div>
                    </div>
                  </div>
                )}

                {!isDashboardLoading && (
                  <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-gray-800 font-bold mb-4">{t.revenueLast7Days || "Revenue (Last 7 Days)"}</h4>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(val) => val.slice(5)} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: any) => [`BIF ${value.toLocaleString()}`, 'Revenue']} />
                            <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-gray-800 font-bold mb-4">{t.ordersLast7Days || "Orders (Last 7 Days)"}</h4>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(val) => val.slice(5)} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip formatter={(value: any) => [value, 'Orders']} />
                            <Bar dataKey="orders" fill="#6366F1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-gray-800 font-bold mb-4">{t.profileViewsLast7Days || "Profile Views (Last 7 Days)"}</h4>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(val) => val.slice(5)} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip formatter={(value: any) => [value, 'Views']} />
                            <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {!isDashboardLoading && (
                  <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="text-gray-800 font-bold mb-4">{t.recentActivity || "Recent Activity"}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                          <tr>
                            <th className="p-3 rounded-l-lg">{t.orderId || "Order ID"}</th>
                            <th className="p-3">{t.customer || "Customer"}</th>
                            <th className="p-3">{t.date || "Date"}</th>
                            <th className="p-3">{t.status || "Status"}</th>
                            <th className="p-3 rounded-r-lg">{t.amount || "Amount"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {recentOrders.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center text-gray-500">{t.noRecentOrders || "No recent orders"}</td></tr>
                          ) : (
                            recentOrders.map((order) => (
                              <tr key={order.id} className="hover:bg-gray-50 transition">
                                <td className="p-3 font-medium">#{String(order.id).substring(0, 8)}</td>
                                <td className="p-3 text-sm">{order.customer_name || "Unknown"}</td>
                                <td className="p-3 text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="p-3">
                                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                                    order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                    order.status === 'Accepted' ? 'bg-blue-100 text-blue-700' :
                                    order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                    order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>{order.status}</span>
                                </td>
                                <td className="p-3 font-medium">BIF {order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!isDashboardLoading && (
                  <div className="mt-8 text-center text-gray-400 text-sm italic">{t.selectOtherTabs || "Select other tabs to manage your pharmacy."}</div>
                )}
              </div>
            )}

            {activeTab === "status" && showStatus && (
              <div className="flex flex-col items-center">
                <div className="text-center">
                  <p>
                    <strong>{t.status || "Status"}:</strong> <span className={`${statusColorMap[app.status]} font-bold`}>{app.status}</span>
                  </p>
                  <p><strong>{t.applicationSubmitted || "Submitted"}:</strong> {new Date(app.created_at).toLocaleString()}</p>
                  {app.status === "pending" && (
                    <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-2xl">
                      <p className="font-bold">{t.underReview || "Under Review"}</p>
                      <p>{t.pendingStatusMessage || "Your application is currently being reviewed by our team."}</p>
                    </div>
                  )}
                  {app.status === "approved" && (
                    <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-2xl">
                      <p className="font-bold">{t.approved || "Approved"}</p>
                      <p>{t.approvedSuccessMessage || "Congratulations! Your application has been approved."}</p>
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
                          router.push(`/apply/pharmacy?id=${app.id}`);
                          // Reset navigation state after a delay in case the user comes back
                          setTimeout(() => setIsNavigating(false), 3000);
                        }}
                        disabled={isNavigating}
                        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 cursor-pointer"
                      >
                        {isNavigating ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            {t.loadingForm || "Loading Form..."}
                          </>
                        ) : (
                          t.editResubmitApp || "Edit and Resubmit Application"
                        )}
                      </button>

                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "availability" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">{t.stockManagement || "My Stock Management"}</h3>

                <div className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3">{editingStockId ? t.editItem : t.addNewItem}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                      placeholder={t.itemName || "Item Name"}
                      value={stockForm.name}
                      onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                      placeholder={t.price || "Price"}
                      type="number"
                      value={stockForm.price}
                      onChange={(e) => setStockForm({ ...stockForm, price: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                      placeholder={t.originalPrice || "Original Price"}
                      type="number"
                      value={stockForm.original_price}
                      onChange={(e) => setStockForm({ ...stockForm, original_price: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                      placeholder={t.quantity || "Quantity"}
                      type="number"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select
                      value={stockForm.category_id}
                      onChange={(e) => {
                        const selectedCat = categories.find(c => c.id === e.target.value);
                        setStockForm({ 
                          ...stockForm, 
                          category_id: e.target.value, 
                        });
                      }}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">{t.selectCategory || "Select Category"}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <input
                      placeholder={t.description}
                      value={stockForm.description}
                      onChange={(e) => setStockForm({ ...stockForm, description: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.applicableInsurances || "Applicable Insurances"}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                      {insurancesList.length > 0 ? insurancesList.map((ins) => (
                        <label key={ins} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={stockForm.insurances.includes(ins)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setStockForm(prev => ({
                                ...prev,
                                insurances: checked 
                                  ? [...prev.insurances, ins]
                                  : prev.insurances.filter(i => i !== ins)
                              }));
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{ins}</span>
                        </label>
                      )) : <p className="text-sm text-gray-500 italic">{t.noInsurancesFoundProfile || "No insurances found in profile."}</p>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t.insuranceSelectionHint || "Select specific insurances. Leave empty to accept all pharmacy insurances."}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition text-sm font-medium text-gray-700 w-full justify-center">
                        {stockForm.image ? (t.changeImage || "Change Image") : (t.uploadImage || "Upload Image")}
                        <input type="file" accept="image/*" onChange={handleStockImageUpload} className="hidden" />
                      </label>
                    </div>
                    {stockForm.image && (
                      <div className="h-32 w-32 rounded overflow-hidden border border-gray-200">
                        <img src={getStockImageUrl(stockForm.image)} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                    {editingStockId && (
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-500 text-white rounded px-6 py-2 hover:bg-gray-600 transition cursor-pointer"
                      >
                        {t.cancel || "Cancel"}
                      </button>
                    )}
                    <button
                      onClick={handleSaveStock}
                      disabled={isAddingStock}
                      className="bg-indigo-600 text-white rounded px-6 py-2 hover:bg-indigo-700 disabled:bg-indigo-400 transition cursor-pointer"
                    >
                      {isAddingStock ? (t.saving || "Saving...") : editingStockId ? (t.updateItem || "Update Item") : (t.addItem || "Add Item")}
                    </button>
                  </div>
                </div>

                <div className="mb-4 flex justify-end">
                  <div className="relative w-full md:w-64">
                    <input
                      type="text"
                      placeholder={t.searchItemsPlaceholder || "Search items..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {isStockLoading ? (
                  <div className="text-center py-10">Loading stock...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                        <tr>
                          <th className="p-3 rounded-l-lg">{t.image}</th>
                          <th className="p-3">{t.fullName || "Name"}</th>
                          <th className="p-3">{t.specialty || "Category"}</th>
                          <th className="p-3">{t.price || "Price"}</th>
                          <th className="p-3">{t.originalPrice || "Orig. Price"}</th>
                          <th className="p-3">{t.quantity || "Quantity"}</th>
                          <th className="p-3">{t.status}</th>
                          <th className="p-3 rounded-r-lg text-right">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stockItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-gray-500">
                              {stockItems.length === 0 ? (t.noItemsInStock || "No items in stock") : (t.noItemsMatchSearch || "No items match your search")}
                            </td>
                          </tr>
                        ) : (
                          stockItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                              <td className="p-3">
                                {item.image ? (
                                  <img src={getStockImageUrl(item.image)} alt={item.name} className="h-24 w-24 rounded object-cover border border-gray-200" />
                                ) : (
                                  <div className="h-24 w-24 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">{t.noImage}</div>
                                )}
                              </td>
                              <td className="p-3 font-medium">{item.name}</td>
                              <td className="p-3 text-sm text-gray-600">{item.categories?.name || t.noCategory}</td>
                              <td className="p-3">{item.price}</td>
                              <td className="p-3 text-gray-500 text-sm">{item.original_price}</td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${item.in_stock && item.quantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {item.in_stock && item.quantity > 0 ? (t.inStock || "In Stock") : (t.outOfStock || "Out-of-Stock")}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleEditStock(item)}
                                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold mr-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                  {t.edit || "Edit"}
                                </button>
                                <button
                                  onClick={() => handleDeleteStock(item.id)}
                                  className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                  {t.delete || "Delete"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">{t.incomingOrders || "Incoming Orders"}</h3>
                
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t.searchItemsPlaceholder || "Search Order ID or Customer..."}
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Status Filter */}
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="All">{t.allStatuses}</option>
                    {["Pending", "Accepted", "Packed", "On the way", "Delivered", "Cancelled"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Date Range */}
                  <input
                    type="date"
                    value={orderStartDate}
                    onChange={(e) => setOrderStartDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={t.startDate}
                  />
                  <input
                    type="date"
                    value={orderEndDate}
                    onChange={(e) => setOrderEndDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={t.endDate}
                  />
                </div>

                {isOrdersLoading ? (
                  <div className="text-center py-10">Loading orders...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                        <tr>
                          <th className="p-3 rounded-l-lg">{t.orderId || "Order ID"}</th>
                          <th className="p-3">{t.customer || "Customer"}</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">{t.totalAmount || "Total Amount"}</th>
                          <th className="p-3 rounded-r-lg">{t.items || "Items"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-gray-500">{t.noBookingsFound || "No orders found"}</td>
                          </tr>
                        ) : (
                          filteredOrders.map((order: Order) => (
                            <tr key={order.id} className="hover:bg-gray-50 transition">
                              <td className="p-3 font-medium">#{String(order.id).substring(0, 8)}</td>
                              <td className="p-3 text-sm text-gray-800">{order.customer_name || "Unknown"}</td>
                              <td className="p-3 text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                              <td className="p-3">
                                <div className="relative inline-block">
                                  <select
                                    value={order.status}
                                    disabled={updatingOrderId === order.id}
                                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                    className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50 ${
                                      order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                      order.status === 'Accepted' ? 'bg-blue-100 text-blue-700' :
                                      order.status === 'Packed' ? 'bg-orange-100 text-orange-700' :
                                      order.status === 'On the way' ? 'bg-purple-100 text-purple-700' :
                                      order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                      order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {["Pending", "Accepted", "Packed", "On the way", "Delivered", "Cancelled"].map((s) => (
                                      <option key={s} value={s} className="bg-white text-gray-900">{s}</option>
                                    ))}
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
                                    {updatingOrderId === order.id ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-medium">BIF {order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</td>
                              <td className="p-3">
                                <details className="group cursor-pointer">
                                  <summary className="text-indigo-600 text-sm font-medium hover:text-indigo-800 list-none flex items-center gap-1">
                                    <span>{t.viewItems || "View Items"} ({order.items.length})</span>
                                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  </summary>
                                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm shadow-inner">
                                    {order.items.map((item: OrderItem, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                        <div className="flex items-center gap-3">
                                          {item.image ? (
                                            <img src={getStockImageUrl(item.image)} alt={item.product_name} className="h-10 w-10 rounded object-cover border border-gray-200" />
                                          ) : (
                                            <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">No Img</div>
                                          )}
                                          <div>
                                            <div className="text-gray-700"><span className="font-bold">{item.quantity}x</span> {item.product_name}</div>
                                            {item.status && (
                                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                                item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                item.status === 'Accepted' ? 'bg-blue-100 text-blue-700' :
                                                item.status === 'Packed' ? 'bg-orange-100 text-orange-700' :
                                                item.status === 'On the way' ? 'bg-purple-100 text-purple-700' :
                                                item.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                item.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                              }`}>{item.status}</span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-gray-600 font-medium">BIF {(item.price * item.quantity).toLocaleString()}</span>
                                      </div>
                                    ))}
                                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                                      <button
                                        onClick={() => handlePrintOrder(order)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded hover:bg-gray-700 transition cursor-pointer"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        {t.printInvoice || "Print Invoice"}
                                      </button>
                                    </div>
                                  </div>
                                </details>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">{t.myPharmacy || "My Pharmacy"}</h3>
                {isProfileLoading ? (
                  <div className="text-center py-10">Loading profile...</div>
                ) : !isEditingProfile ? (
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="flex-1 w-full bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <div className="flex flex-col items-center md:flex-row md:items-center gap-4 md:gap-6 mb-8">
                        <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm overflow-hidden border border-gray-200 shrink-0">
                          {profileForm.image ? (
                            <img src={getImageUrl(profileForm.image)} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden w-full text-center md:text-left">
                          <h4 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{profileForm.name}</h4>
                          <p className="text-gray-500 text-sm mt-1 truncate">{profileForm.email || (t.email + " not set")}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="text-center md:text-left">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t.whatsappNumber || "WhatsApp"}</h5>
                          <p className="text-gray-900 font-medium">{profileForm.whatsapp_number || "Not set"}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t.paymentId || "Payment ID"}</h5>
                          <p className="text-gray-900 font-medium">{profileForm.payment_id || "Not set"}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t.country || "Country"}</h5>
                          <p className="text-gray-900 font-medium">{profileForm.country || "Not set"}</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                          🕒 {t.openingHoursLabel || "Opening Hours"}
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {openingHours.map((day, i) => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-gray-100">
                              <span className="font-medium text-gray-700">{day.day}</span>
                              <span className={day.isClosed ? "text-red-500 font-medium" : "text-green-600 font-medium"}>
                                {day.isClosed ? (t.closed || "Closed") : day.is24Hours ? (t.hours24 || "24 Hours") : `${day.open} - ${day.close}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6 mt-6">
                        <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                          📍 {t.locations || "Locations"}
                        </h5>
                        <div className="space-y-3">
                          {location.map((loc, i) => (
                            <div key={i} className="text-sm p-3 bg-white rounded border border-gray-100 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-800">{loc.city || t.cityNotSet || "City not set"}</p>
                                <p className="text-gray-600">{loc.address || t.addressNotSet || "Address not set"}</p>
                                {loc.phone && <p className="text-gray-500 text-xs mt-1">📞 {loc.phone}</p>}
                              </div>
                              {(loc.address || loc.city || (loc.latitude && loc.longitude)) && (
                                <a
                                  href={loc.latitude && loc.longitude ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.address || ""} ${loc.city || ""}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-full transition-colors"
                                  title="View on Google Maps"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6 mt-6">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">📞 {t.contactDetails || "Contact Details"}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">{t.customerSupportEmail || "Customer Support Email"}</span>
                            <span className="text-gray-700 font-medium">{profileForm.contact_email || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">{t.phoneWhatsApp || "Phone / WhatsApp"}</span>
                            <span className="text-gray-700 font-medium">{profileForm.contact_phone || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">{t.headOffice || "Head Office"}</span>
                            <span className="text-gray-700 font-medium">{profileForm.contact_office || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">{t.website || "Website"}</span>
                            <a href={profileForm.contact_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{profileForm.contact_website || "N/A"}</a>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6 mt-6">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🏥 {t.acceptedInsurances || "Accepted Insurances"}</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {insurancesList.length > 0 ? insurancesList.map((p, i) => <li key={i} className="text-gray-600">➢ {p}</li>) : <li className="text-gray-500 italic">{t.noInsurancesListed || "No insurances listed"}</li>}
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm font-medium whitespace-nowrap flex items-center gap-2 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t.updateProfile}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Image Upload */}
                    <div className="flex items-center gap-6">
                      <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shadow-sm overflow-hidden border border-gray-200">
                        {profileForm.image ? (
                          <img src={getImageUrl(profileForm.image)} alt="Profile" className="h-full w-full object-cover" />
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
                              {t.changePhoto}
                            </>
                          )}
                          <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" disabled={isUploadingProfileImage} />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">{t.pharmacyName}</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          disabled
                          className="w-full border rounded-lg px-4 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">{t.email}</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          disabled
                          className="w-full border rounded-lg px-4 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">{t.whatsappNumber}</label>
                        <input
                          type="text"
                          value={profileForm.whatsapp_number}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">{t.country}</label>
                        <input
                          type="text"
                          value={profileForm.country}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value.toUpperCase() }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">{t.paymentId}</label>
                        <input
                          type="text"
                          value={profileForm.payment_id}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, payment_id: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-800 mb-4">{t.contactDetails}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">{t.customerSupportEmail}</label>
                          <input
                            type="email"
                            value={profileForm.contact_email}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_email: e.target.value }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">{t.phoneWhatsApp}</label>
                          <input
                            type="text"
                            value={profileForm.contact_phone}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">{t.headOffice}</label>
                          <input
                            type="text"
                            value={profileForm.contact_office}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_office: e.target.value.toUpperCase() }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">{t.website}</label>
                          <input
                            type="text"
                            value={profileForm.contact_website}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_website: e.target.value }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-800 mb-4">{t.manageOpeningHours}</h4>
                      <div className="space-y-3">
                        {openingHours.map((day, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <select
                              value={day.day}
                              onChange={(e) => updateDay(i, "day", e.target.value)}
                              className="w-32 md:w-40 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                              <option value="">{t.selectDay}</option>
                              {[
                                { val: "MONDAY", label: t.monday || "MONDAY" },
                                { val: "TUESDAY", label: t.tuesday || "TUESDAY" },
                                { val: "WEDNESDAY", label: t.wednesday || "WEDNESDAY" },
                                { val: "THURSDAY", label: t.thursday || "THURSDAY" },
                                { val: "FRIDAY", label: t.friday || "FRIDAY" },
                                { val: "SATURDAY", label: t.saturday || "SATURDAY" },
                                { val: "SUNDAY", label: t.sunday || "SUNDAY" }
                              ]
                                .filter((d) => d.val === day.day || !openingHours.some((h) => h.day === d.val))
                                .map((d) => (
                                <option key={d.val} value={d.val}>{d.label}</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={day.isClosed}
                                onChange={(e) => updateDay(i, "isClosed", e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              {t.closed}
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!day.is24Hours}
                                onChange={(e) => updateDay(i, "is24Hours", e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              {t.hours24}
                            </label>
                            {!day.isClosed && !day.is24Hours && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={day.open}
                                  onChange={(e) => updateDay(i, "open", e.target.value)}
                                  className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                  type="time"
                                  value={day.close}
                                  onChange={(e) => updateDay(i, "close", e.target.value)}
                                  className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                              </div>
                            )}
                            <button
                              onClick={() => removeOpeningHour(i)}
                              className="ml-auto bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-full transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                              title="Remove"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button onClick={addOpeningHour} type="button" className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1 mt-2 cursor-pointer">
                          {t.addAnotherDay || "+ Add Another Day"}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-800 mb-4">{t.manageLocation || "Manage location"}</h4>
                      <div className="space-y-3">
                        {location.map((loc, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex flex-wrap items-center gap-4 mb-3">
                              <input
                                type="text"
                                placeholder={t.city || "City"}
                                value={loc.city}
                                onChange={(e) => updateLocation(index, "city", e.target.value)}
                                className="flex-1 min-w-[120px] border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder={t.addressStreet || "Address / Street"}
                                value={loc.address}
                                onChange={(e) => updateLocation(index, "address", e.target.value)}
                                className="flex-2 min-w-[200px] border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <input
                                type="text"
                                value={loc.latitude || ""}
                                onChange={(e) => updateLocation(index, "latitude", e.target.value)}
                                className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Latitude (e.g. -3.38)"
                              />
                              <input
                                type="text"
                                value={loc.longitude || ""}
                                onChange={(e) => updateLocation(index, "longitude", e.target.value)}
                                className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Longitude (e.g. 29.36)"
                              />
                              <input
                                type="text"
                                value={loc.phone || ""}
                                onChange={(e) => updateLocation(index, "phone", e.target.value)}
                                className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder={t.phoneOptional || "Phone (Optional)"}
                              />
                            </div>
                            <div className="mt-2 flex justify-end gap-3 items-center">
                              <button
                                onClick={() => {
                                  const query = `${loc.address} ${loc.city}`.trim();
                                  if (!query) return toast.error(t.enterAddressOrCity);
                                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                                }}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {t.findOnMap}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCurrentLocation(index)}
                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md transition flex items-center gap-1 cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {t.useCurrentLocation}
                              </button>
                              <button
                                onClick={() => handlePasteCoordinates(index)}
                                className="text-xs flex items-center gap-1 text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {t.pasteCoordinates}
                              </button>
                            </div>
                            {(loc.city || loc.address || (loc.latitude && loc.longitude)) && (
                              <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                                <iframe
                                  width="100%"
                                  height="100%"
                                  style={{ border: 0 }}
                                  loading="lazy"
                                  src={`https://maps.google.com/maps?q=${loc.latitude && loc.longitude ? `${loc.latitude},${loc.longitude}` : encodeURIComponent(`${loc.address || ""} ${loc.city || ""}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                ></iframe>
                              </div>
                            )}
                          </div>
                        ))}

                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-800 mb-4">{t.partnerInsurances}</h4>
                      <div className="space-y-3">
                        {insurancesList.map((ins, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-gray-500">➢</span>
                            <input
                              type="text"
                              value={ins}
                              onChange={(e) => updateInsurance(index, e.target.value)}
                              className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              placeholder={t.insuranceName}
                            />
                            <button
                              onClick={() => removeInsurance(index)}
                              className="bg-red-50 text-red-500 hover:bg-red-100 p-1.5 rounded-full transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button onClick={addInsurance} type="button" className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1 mt-2 cursor-pointer">
                          {t.addAnotherInsurance}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                        disabled={isSavingProfile}
                      >
                        {t.cancel}
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition flex items-center gap-2 cursor-pointer"
                      >
                        {isSavingProfile ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            {t.saving}
                          </>
                        ) : t.saveProfile}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">{t.settings || "Settings"}</h3>
                {isProfileLoading ? (
                  <div className="text-center py-10">Loading settings...</div>
                ) : (
                  <div className="max-w-2xl">
                    <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">{t.fullName || "Full Name"}</label>
                      <div className="text-lg font-bold text-gray-900">{profileForm.name}</div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="font-bold text-gray-800 mb-4">{t.security || "Security"}</h4>
                      {!isEditingPassword ? (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">{t.password || "Password"}</label>
                            <div className="text-lg font-bold text-gray-900">••••••••</div>
                          </div>
                          <button
                            onClick={() => setIsEditingPassword(true)}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium cursor-pointer"
                          >
                            {t.updatePassword || "Update Password"}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                          <div>
                            <label className="block font-semibold text-gray-700 mb-1">{t.currentPassword || "Current Password"}</label>
                            <div className="relative">
                              <input
                                type={showOldPassword ? "text" : "password"}
                                value={passwordForm.oldPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-10"
                                placeholder={t.enterCurrentPassword || "Enter current password"}
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
                            <label className="block font-semibold text-gray-700 mb-1">{t.newPassword}</label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-10"
                                placeholder={t.newPassword}
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
                            <label className="block font-semibold text-gray-700 mb-1">{t.confirmNewPassword}</label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-10"
                                placeholder={t.confirmNewPassword}
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
                              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                              disabled={isSavingPassword}
                            >
                              {t.cancel}
                            </button>
                            <button
                              onClick={handlePasswordUpdate}
                              disabled={isSavingPassword || !passwordForm.newPassword || !passwordForm.oldPassword}
                              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition flex items-center gap-2 cursor-pointer"
                            >
                              {isSavingPassword ? t.updating : t.savePassword}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


            {showLogoutConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/10">
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{t.confirmLogout}</h3>
                  <p className="text-gray-600 mb-6">{t.confirmLogoutMessage}</p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      {t.cancel}
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
                          {t.loggingOut}
                        </>
                      ) : t.logout}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDeleteStockConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/10">
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{t.confirmDelete}</h3>
                  <p className="text-gray-600 mb-6">{t.confirmDeleteStock}</p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteStockConfirm(false);
                        setStockToDeleteId(null);
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      disabled={isDeletingStock}
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={confirmDeleteStock}
                      disabled={isDeletingStock}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-red-400 cursor-pointer"
                    >
                      {isDeletingStock ? t.deleting : t.delete}
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