"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";

type PharmacyApplication = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  image?: string | null;
  opening_hours?: string | null;
  location?: string | null;
};

type StockItem = {
  id: string;
  name: string;
  price: number;
  original_price: number;
  quantity: number;
  in_stock: boolean;
  description?: string;
  category: string;
  image?: string;
};

type Category = {
  id: string;
  name: string;
};

interface DashboardClientProps {
  app: PharmacyApplication;
}

export default function DashboardClient({ app }: DashboardClientProps) {
  const [showStatus, setShowStatus] = useState(false);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
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
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [openingHours, setOpeningHours] = useState<{ day: string; open: string; close: string; isClosed: boolean; is24Hours?: boolean }[]>([]);
  const [location, setlocation] = useState<{ city: string; address: string; latitude: string; longitude: string; phone: string }[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isUploadingStockImage, setIsUploadingStockImage] = useState(false);
  const [stockForm, setStockForm] = useState({ name: "", price: "", original_price: "", quantity: "", description: "", category: "", image: "" });

  const statusColorMap = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-red-500",
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

  const handleNavClick = (tab: string) => {
    if (tab !== "status" && app.status !== "approved") {
      toast.error("You need to be approved first");
      return;
    }
    setActiveTab(tab);
    if (tab === "status") setShowStatus(true);
  };

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
          setlocation(locs);
        })
        .catch((err) => console.error("Failed to load profile", err))
        .finally(() => setIsProfileLoading(false));
    }
  }, [activeTab, app.id]);

  useEffect(() => {
    if (activeTab === "availability" && app.id) {
      setIsStockLoading(true);
      Promise.all([
        fetch(`/api/pharmacy/stock?pharmacy_id=${app.id}`).then((res) => res.json()),
        fetch(`/api/categories`).then((res) => res.json())
      ])
        .then(([stockData, categoriesData]) => {
          if (Array.isArray(stockData)) setStockItems(stockData);
          if (Array.isArray(categoriesData)) setCategories(categoriesData);
        })
        .catch((err) => console.error("Failed to load data", err))
        .finally(() => setIsStockLoading(false));
    }
  }, [activeTab, app.id]);

  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfileImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "pharmacy-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setProfileForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    } finally {
      setIsUploadingProfileImage(false);
    }
  }

  async function handleStockImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingStockImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "medicine-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setStockForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
    } finally {
      setIsUploadingStockImage(false);
    }
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true);

    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      toast.error("Passwords do not match!");
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
    };

    if (!updateData.password) {
      delete (updateData as any).password;
    }
    delete (updateData as any).confirmPassword;

    try {
      const res = await fetch(`/api/pharmacy/apply?id=${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) throw new Error("Failed to update profile");
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
      if (i === index) return { ...loc, [field]: value };
      return loc;
    });
    setlocation(newlocation);
  };

  const addLocation = () => {
    setlocation([...location, { city: "", address: "", latitude: "", longitude: "", phone: "" }]);
  };

  const removeLocation = (index: number) => {
    setlocation(location.filter((_, i) => i !== index));
  };

  const handleCurrentLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.loading("Getting location...", { id: "geo" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation(index, "latitude", position.coords.latitude.toFixed(6));
        updateLocation(index, "longitude", position.coords.longitude.toFixed(6));
        toast.success("Location updated", { id: "geo" });
      },
      (error) => {
        console.error(error);
        toast.error("Unable to retrieve location. Please allow location access.", { id: "geo" });
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
          toast.success("Coordinates pasted from clipboard");
          return;
        }
      }
      toast.error("Clipboard does not contain valid coordinates (e.g. -1.94, 30.05)");
    } catch (err) {
      toast.error("Unable to access clipboard");
    }
  };

  async function handleAddStock() {
    if (!stockForm.name || !stockForm.price || !stockForm.category) {
      toast.error("Name, Price, and Category are required");
      return;
    }
    setIsAddingStock(true);
    try {
      const res = await fetch("/api/pharmacy/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stockForm, pharmacy_id: app.id, in_stock: true }),
      });
      if (res.ok) {
        const newItem = await res.json();
        setStockItems((prev) => [...prev, newItem]);
        setStockForm({ name: "", price: "", original_price: "", quantity: "", description: "", category: "", image: "" });
        toast.success("Stock item added");
      } else {
        toast.error("Failed to add item");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error adding item");
    } finally {
      setIsAddingStock(false);
    }
  }

  async function handleDeleteStock(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      const res = await fetch(`/api/pharmacy/stock?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setStockItems((prev) => prev.filter((item) => item.id !== id));
        toast.success("Item deleted");
      }
    } catch (e) {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-white shadow-lg p-4 md:p-6 flex flex-col space-y-4 border-r border-gray-200 overflow-y-auto transition-all duration-300">
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="h-10 w-10 md:h-20 md:w-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shadow-sm mb-3 overflow-hidden transition-all duration-300">
            {app.image ? (
              <img src={app.image} alt={app.name} className="h-full w-full object-cover" />
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
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition disabled:bg-blue-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden md:block">Dashboard</span>
              </>
          </button>
          {activeTab === "dashboard" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("availability")}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition disabled:bg-orange-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:block">My Stock</span>
              </>
          </button>
          {activeTab === "availability" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-orange-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("bookings")}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition disabled:bg-green-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:block">Orders</span>
              </>
          </button>
          {activeTab === "bookings" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-green-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("scan")}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition disabled:bg-teal-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="hidden md:block">Scan Bill</span>
              </>
          </button>
          {activeTab === "scan" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-teal-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("profile")}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:bg-indigo-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden md:block">My pharmacy</span>
              </>
          </button>
          {activeTab === "profile" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("status")}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 disabled:bg-purple-400 transition"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:block">Status</span>
              </>
          </button>
          {activeTab === "status" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-purple-600 rounded-full"></div>}
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition"
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
                          router.push(`/apply/pharmacy?id=${app.id}`);
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

            {activeTab === "availability" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800">My Stock Management</h3>

                <div className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3">Add New Item</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                      placeholder="Item Name"
                      value={stockForm.name}
                      onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                      placeholder="Price"
                      type="number"
                      value={stockForm.price}
                      onChange={(e) => setStockForm({ ...stockForm, price: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                      placeholder="Original Price"
                      type="number"
                      value={stockForm.original_price}
                      onChange={(e) => setStockForm({ ...stockForm, original_price: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                      placeholder="Quantity"
                      type="number"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select
                      value={stockForm.category}
                      onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Description"
                      value={stockForm.description}
                      onChange={(e) => setStockForm({ ...stockForm, description: e.target.value })}
                      className="border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition text-sm font-medium text-gray-700 w-full justify-center">
                        {isUploadingStockImage ? "Uploading..." : stockForm.image ? "Change Image" : "Upload Image"}
                        <input type="file" accept="image/*" onChange={handleStockImageUpload} className="hidden" disabled={isUploadingStockImage} />
                      </label>
                    </div>
                    {stockForm.image && (
                      <div className="h-32 w-32 rounded overflow-hidden border border-gray-200">
                        <img src={stockForm.image} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <button
                      onClick={handleAddStock}
                      disabled={isAddingStock}
                      className="bg-indigo-600 text-white rounded px-6 py-2 hover:bg-indigo-700 disabled:bg-indigo-400 transition"
                    >
                      {isAddingStock ? "Adding..." : "Add Item"}
                    </button>
                  </div>
                </div>

                {isStockLoading ? (
                  <div className="text-center py-10">Loading stock...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                        <tr>
                          <th className="p-3 rounded-l-lg">Image</th>
                          <th className="p-3">Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Orig. Price</th>
                          <th className="p-3">Quantity</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 rounded-r-lg text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stockItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-gray-500">
                              No items in stock
                            </td>
                          </tr>
                        ) : (
                          stockItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                              <td className="p-3">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="h-24 w-24 rounded object-cover border border-gray-200" />
                                ) : (
                                  <div className="h-24 w-24 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                )}
                              </td>
                              <td className="p-3 font-medium">{item.name}</td>
                              <td className="p-3 text-sm text-gray-600">{item.category}</td>
                              <td className="p-3">{item.price}</td>
                              <td className="p-3 text-gray-500 text-sm">{item.original_price}</td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${item.in_stock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {item.in_stock ? "In Stock" : "Out of Stock"}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDeleteStock(item.id)}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                  Delete
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

            {activeTab === "profile" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800">My Pharmacy</h3>
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
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                          🕒 Opening Hours
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {openingHours.map((day, i) => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-gray-100">
                              <span className="font-medium text-gray-700">{day.day}</span>
                              <span className={day.isClosed ? "text-red-500 font-medium" : "text-green-600 font-medium"}>
                                {day.isClosed ? "Closed" : day.is24Hours ? "24 Hours" : `${day.open} - ${day.close}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6 mt-6">
                        <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                          📍 locations
                        </h5>
                        <div className="space-y-3">
                          {location.map((loc, i) => (
                            <div key={i} className="text-sm p-3 bg-white rounded border border-gray-100 flex justify-between items-center">
                              <div>
                                <p className="font-bold text-gray-800">{loc.city || "City not set"}</p>
                                <p className="text-gray-600">{loc.address || "Address not set"}</p>
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
                        <label className="block font-semibold text-gray-700 mb-1">Pharmacy Name</label>
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
                        <label className="block font-semibold text-gray-700 mb-1">Payment ID</label>
                        <input
                          type="text"
                          value={profileForm.payment_id}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, payment_id: e.target.value }))}
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-800 mb-4">Manage Opening Hours</h4>
                      <div className="space-y-3">
                        {openingHours.map((day, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <select
                              value={day.day}
                              onChange={(e) => updateDay(i, "day", e.target.value)}
                              className="w-32 md:w-40 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                              <option value="">Select Day</option>
                              {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
                                .filter((d) => d === day.day || !openingHours.some((h) => h.day === d))
                                .map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={day.isClosed}
                                onChange={(e) => updateDay(i, "isClosed", e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              Closed
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!day.is24Hours}
                                onChange={(e) => updateDay(i, "is24Hours", e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              24 Hours
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
                              className="ml-auto text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                              title="Remove"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button onClick={addOpeningHour} type="button" className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1 mt-2">
                          + Add Another Day
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-800 mb-4">Manage location</h4>
                      <div className="space-y-3">
                        {location.map((loc, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex flex-wrap items-center gap-4 mb-3">
                              <input
                                type="text"
                                placeholder="City"
                                value={loc.city}
                                onChange={(e) => updateLocation(index, "city", e.target.value)}
                                className="flex-1 min-w-[120px] border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Address / Street"
                                value={loc.address}
                                onChange={(e) => updateLocation(index, "address", e.target.value)}
                                className="flex-2 min-w-[200px] border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                              <button
                                onClick={() => removeLocation(index)}
                                className="ml-auto text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                                title="Remove"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Find on Map
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCurrentLocation(index)}
                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md transition flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Use Current Location
                              </button>
                              <button
                                onClick={() => handlePasteCoordinates(index)}
                                className="text-xs flex items-center gap-1 text-teal-600 hover:text-teal-800 font-medium"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Paste Coordinates
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
                        <button onClick={addLocation} type="button" className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1 mt-2">
                          + Add Another Location
                        </button>
                      </div>
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