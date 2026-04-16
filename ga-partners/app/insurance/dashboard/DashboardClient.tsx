"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";

type InsuranceApplication = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  image?: string | null;
};

interface DashboardClientProps {
  app: InsuranceApplication;
}

const formatPrice = (value: string) => {
  const rawValue = value.replace(/,/g, "");
  if (/^\d+$/.test(rawValue)) {
    return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return value;
};

const CURRENCIES = ["RWF", "BIF", "KES", "UGX", "TZS", "CDF", "USD", "EUR"];

const getCurrencyForCountry = (country: string) => {
  const c = (country || "").toLowerCase();
  if (c.includes("rwanda")) return "RWF";
  if (c.includes("burundi")) return "BIF";
  if (c.includes("kenya")) return "KES";
  if (c.includes("uganda")) return "UGX";
  if (c.includes("tanzania")) return "TZS";
  if (c.includes("congo") || c.includes("drc")) return "CDF";
  return "USD";
};

const getImageUrl = (path: string | null | undefined) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/insurance-images/${path}`;
};

export default function DashboardClient({ app }: DashboardClientProps) {
  const [showStatus, setShowStatus] = useState(false);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingUpdates, setIsEditingUpdates] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ totalViews: 0 });
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
      name: "",
      email: "",
      whatsapp_number: "",
      country: "",
      origin_country: "",
      payment_id: "",
      image: "",
      password: "",
      confirmPassword: "",
      insurance_plans: "",
      coverage_summary: "",
      claim_process: "",
      partner_hospitals: "",
      partner_pharmacies: "",
      contact_email: "",
      contact_phone: "",
      contact_office: "",
      contact_website: "",
    });
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [plansList, setPlansList] = useState<{ title: string; description: string; price: string; currency: string }[]>([]);
    const [hospitalsList, setHospitalsList] = useState<string[]>([]);
    const [pharmaciesList, setPharmaciesList] = useState<string[]>([]);
    const [officeLocations, setOfficeLocations] = useState<{ type: string; city: string; address: string; phone: string; latitude: string; longitude: string }[]>([]);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const statusColorMap = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-red-500",
  };

  const [passwordForm, setPasswordForm] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/insurance/logout", { method: "POST" });
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
          const res = await fetch(`/api/insurance/change-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: app.id,
              oldPassword: passwordForm.oldPassword,
              newPassword: passwordForm.newPassword,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to update password");
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

  const handleNavClick = (tab: string) => {
    if (app.status !== "approved" && tab !== "status") {
      toast.error("You need to be approved first");
      return;
    }
    setActiveTab(tab);
    if (tab === "status") setShowStatus(true);
  };

  useEffect(() => {
    if (activeTab === "dashboard" && app.id) {
      setIsDashboardLoading(true);
      fetch(`/api/insurance/apply?id=${app.id}`)
        .then((res) => res.json())
        .then((data) => {
          setDashboardStats({ totalViews: data.views || 0 });
        })
        .catch((err) => console.error("Failed to load dashboard stats", err))
        .finally(() => setIsDashboardLoading(false));
    }

    if ((activeTab === "profile" || activeTab === "updates") && app.id) {
        setIsProfileLoading(true);
        fetch(`/api/insurance/apply?id=${app.id}`)
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`Failed to fetch data: ${res.status} ${text}`);
            }
            return res.json();
          })
          .then((data) => {
            let contactParsed = { email: "", phone: "", office: "", website: "" };
            try {
              if (data.contact_details && data.contact_details.startsWith("{")) {
                contactParsed = JSON.parse(data.contact_details);
              } else {
                contactParsed.office = data.contact_details || "";
              }
            } catch (e) {
              contactParsed.office = data.contact_details || "";
            }

            let parsedPlans: { title: string; description: string; price: string; currency: string }[] = [];
            try {
              if (data.insurance_plans && data.insurance_plans.trim().startsWith("[")) {
                const rawPlans = JSON.parse(data.insurance_plans);
                parsedPlans = rawPlans.map((p: any) => ({
                  ...p,
                  price: formatPrice(String(p.price || "")),
                  currency: p.currency || getCurrencyForCountry(data.country)
                }));
              } else if (data.insurance_plans) {
                parsedPlans = [{ title: "General Plan", description: data.insurance_plans, price: "", currency: getCurrencyForCountry(data.country) }];
              }
            } catch (e) {
              parsedPlans = [];
            }
            setPlansList(parsedPlans);

            let parsedHospitals: string[] = [];
            try {
              if (data.partner_hospitals && data.partner_hospitals.trim().startsWith("[")) {
                parsedHospitals = JSON.parse(data.partner_hospitals);
              } else if (data.partner_hospitals) {
                parsedHospitals = data.partner_hospitals.split('\n').map((s: string) => s.replace(/^➢\s*/, '').trim()).filter(Boolean);
              }
            } catch (e) { parsedHospitals = []; }
            setHospitalsList(parsedHospitals);

            let parsedPharmacies: string[] = [];
            try {
              if (data.partner_pharmacies && data.partner_pharmacies.trim().startsWith("[")) {
                parsedPharmacies = JSON.parse(data.partner_pharmacies);
              } else if (data.partner_pharmacies) {
                parsedPharmacies = data.partner_pharmacies.split('\n').map((s: string) => s.replace(/^➢\s*/, '').trim()).filter(Boolean);
              }
            } catch (e) { parsedPharmacies = []; }
            setPharmaciesList(parsedPharmacies);

            let parsedLocations: any[] = [];
            try {
              if (data.office_locations) {
                parsedLocations = JSON.parse(data.office_locations);
              }
            } catch (e) { parsedLocations = []; }
            setOfficeLocations(parsedLocations);

            setProfileForm({
              name: data.name || "",
              email: data.email || "",
              whatsapp_number: data.whatsapp_number || "",
              country: data.country || "",
              origin_country: data.origin_country || data.originCountry || "",
              payment_id: data.payment_id || "",
              image: data.image || "",
              password: "",
              confirmPassword: "",
              insurance_plans: data.insurance_plans || "",
              coverage_summary: data.coverage_summary || "",
              claim_process: data.claim_process || "",
              partner_hospitals: data.partner_hospitals || "",
              partner_pharmacies: data.partner_pharmacies || "",
              contact_email: contactParsed.email || "",
              contact_phone: contactParsed.phone || "",
              contact_office: contactParsed.office || "",
              contact_website: contactParsed.website || "",
            });
          })
          .catch((err) => console.error("Failed to load profile", err))
          .finally(() => setIsProfileLoading(false));
      }
  }, [activeTab, app.id]);

  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    setProfileForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true);

    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      toast.error("Passwords do not match!");
      setIsSavingProfile(false);
      return;
    }

    const contactJson = JSON.stringify({
      email: profileForm.contact_email,
      phone: profileForm.contact_phone,
      office: profileForm.contact_office,
      website: profileForm.contact_website
    });

    const formData = new FormData();
    formData.append("id", app.id);
    formData.append("name", profileForm.name);
    formData.append("email", profileForm.email);
    formData.append("whatsapp_number", profileForm.whatsapp_number);
    formData.append("country", profileForm.country);
    formData.append("origin_country", profileForm.origin_country);
    formData.append("payment_id", profileForm.payment_id);
    formData.append("contact_details", contactJson);

    if (profileImageFile) formData.append("image", profileImageFile);
    else if (profileForm.image && !profileForm.image.startsWith("blob:")) formData.append("image", profileForm.image);

    try {
      const res = await fetch(`/api/insurance/apply`, {
        method: "PUT",
        body: formData,
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

  function handleBulletListKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, field: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      const newValue = value.substring(0, start) + "\n➢ " + value.substring(end);
      
      setProfileForm((prev: any) => ({ ...prev, [field]: newValue }));
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
    }
  }

  function addPlan() {
    setPlansList([...plansList, { title: "", description: "", price: "", currency: getCurrencyForCountry(profileForm.country) }]);
  }

  function removePlan(index: number) {
    setPlansList(plansList.filter((_, i) => i !== index));
  }

  function updatePlan(index: number, field: "title" | "description" | "price" | "currency", value: string) {
    const newPlans = [...plansList];
    if (field === "price") {
      newPlans[index][field] = formatPrice(value);
    } else {
      newPlans[index][field] = value;
    }
    setPlansList(newPlans);
  }

  function addHospital() { setHospitalsList([...hospitalsList, ""]); }
  function removeHospital(index: number) { setHospitalsList(hospitalsList.filter((_, i) => i !== index)); }
  function updateHospital(index: number, value: string) {
    const list = [...hospitalsList];
    list[index] = value;
    setHospitalsList(list);
  }

  function addPharmacy() { setPharmaciesList([...pharmaciesList, ""]); }
  function removePharmacy(index: number) { setPharmaciesList(pharmaciesList.filter((_, i) => i !== index)); }
  function updatePharmacy(index: number, value: string) {
    const list = [...pharmaciesList];
    list[index] = value;
    setPharmaciesList(list);
  }

  function addLocation() { setOfficeLocations([...officeLocations, { type: "Branch Office", city: "", address: "", phone: "", latitude: "", longitude: "" }]); }
  function removeLocation(index: number) { setOfficeLocations(officeLocations.filter((_, i) => i !== index)); }
  function updateLocation(index: number, field: string, value: string) {
    const list = [...officeLocations];
    if (field === "city" || field === "address") {
      (list[index] as any)[field] = value.toUpperCase();
    } else {
      (list[index] as any)[field] = value;
    }
    setOfficeLocations(list);
  }

  function handleUseCurrentLocation(index: number) {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const list = [...officeLocations];
      list[index].latitude = position.coords.latitude.toFixed(6);
      list[index].longitude = position.coords.longitude.toFixed(6);
      setOfficeLocations(list);
    }, (err) => toast.error("Could not retrieve location: " + err.message));
  }

  async function handlePasteCoordinates(index: number) {
    try {
      const text = await navigator.clipboard.readText();
      const matches = text.match(/-?\d+(\.\d+)?/g);
      if (matches && matches.length >= 2) {
        const list = [...officeLocations];
        list[index].latitude = matches[0];
        list[index].longitude = matches[1];
        setOfficeLocations(list);
      } else {
        toast.error("Could not find valid coordinates (e.g., '-1.95, 30.06') in clipboard.");
      }
    } catch (err) {
      toast.error("Failed to read clipboard.");
    }
  }

  async function handleSaveUpdates() {
    setIsSavingProfile(true);

    const plansJson = JSON.stringify(plansList);
    const hospitalsJson = JSON.stringify(hospitalsList);
    const pharmaciesJson = JSON.stringify(pharmaciesList);
    const locationsJson = JSON.stringify(officeLocations);
    const contactJson = JSON.stringify({
      email: profileForm.contact_email,
      phone: profileForm.contact_phone,
      office: profileForm.contact_office,
      website: profileForm.contact_website
    });

    const formData = new FormData();
    formData.append("id", app.id);
    formData.append("name", profileForm.name);
    formData.append("email", profileForm.email);
    formData.append("whatsapp_number", profileForm.whatsapp_number);
    formData.append("payment_id", profileForm.payment_id);
    formData.append("country", profileForm.country);
    formData.append("origin_country", profileForm.origin_country);
    formData.append("contact_details", contactJson);
    formData.append("insurance_plans", plansJson);
    formData.append("partner_hospitals", hospitalsJson);
    formData.append("partner_pharmacies", pharmaciesJson);
    formData.append("office_locations", locationsJson);
    formData.append("coverage_summary", profileForm.coverage_summary);
    formData.append("claim_process", profileForm.claim_process);

    try {
      const res = await fetch(`/api/insurance/apply`, {
        method: "PUT",
        body: formData,
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update information");
      }
      toast.success("Information updated successfully!");
      router.refresh();
      setIsEditingUpdates(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error updating information");
    } finally {
      setIsSavingProfile(false);
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
            onClick={() => handleNavClick("updates")}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition disabled:bg-orange-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:block">Updates</span>
              </>
          </button>
          {activeTab === "updates" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-orange-600 rounded-full"></div>}
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
                <span className="hidden md:block">My Insurance</span>
              </>
          </button>
          {activeTab === "profile" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("settings")}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-gray-600 text-white rounded-2xl hover:bg-gray-700 transition disabled:bg-gray-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:block">Settings</span>
              </>
          </button>
          {activeTab === "settings" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-gray-600 rounded-full"></div>}
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

            {activeTab === "dashboard" && (
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">Dashboard Overview</h3>
                {isDashboardLoading ? (
                  <div className="text-center py-10">Loading stats...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Profile Views</h4>
                        <div className="text-4xl font-bold text-indigo-600">{dashboardStats.totalViews}</div>
                      </div>
                    </div>
                    <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="text-gray-800 font-bold mb-4">Recent Activity</h4>
                      <div className="text-center py-8 text-gray-400 italic">
                        No recent activity found.
                      </div>
                    </div>
                  </>
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
                          router.push(`/apply/insurance?id=${app.id}`);
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

            {activeTab === "updates" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">Insurance Updates</h3>
                {isProfileLoading ? (
                  <div className="text-center py-10">Loading updates...</div>
                ) : !isEditingUpdates ? (
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="flex-1 w-full bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6">
                      <div>
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🛡️ Insurance Plans</h4>
                        {plansList.length > 0 ? (
                          <div className="grid gap-4">
                            {plansList.map((plan, i) => (
                              <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                  <h5 className="font-bold text-gray-800">{plan.title}</h5>
                                  {plan.price && <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">{plan.price} {plan.currency}</span>}
                                </div>
                                <p className="text-gray-600 text-sm whitespace-pre-wrap">{plan.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-gray-500 italic">No plans listed.</p>}
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">📋 Coverage Summary</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{profileForm.coverage_summary || "No coverage summary available."}</p>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">📄 Claim Process</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{profileForm.claim_process || "No claim process details available."}</p>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🏥 Partner Hospitals</h4>
                        {hospitalsList.length > 0 ? (
                          <ul className="list-none space-y-1">
                            {hospitalsList.map((h, i) => <li key={i} className="text-gray-600">➢ {h}</li>)}
                          </ul>
                        ) : <p className="text-gray-500 italic">No partner hospitals listed.</p>}
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">💊 Partner Pharmacies</h4>
                        {pharmaciesList.length > 0 ? (
                          <ul className="list-none space-y-1">
                            {pharmaciesList.map((p, i) => <li key={i} className="text-gray-600">➢ {p}</li>)}
                          </ul>
                        ) : <p className="text-gray-500 italic">No partner pharmacies listed.</p>}
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🏢 Office Locations</h4>
                        {officeLocations.length > 0 ? (
                          <div className="space-y-3">
                            {officeLocations.map((loc, i) => (
                              <div key={i} className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-100">
                                <p className="font-bold text-gray-800">{loc.type} - {loc.city}</p>
                                <p>{loc.address}</p>
                                {loc.phone && <p>📞 {loc.phone}</p>}
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-gray-500 italic">No office locations listed.</p>}
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">📞 Contact Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">Customer Support Email</span>
                            <span className="text-gray-700 font-medium">{profileForm.contact_email || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">Phone / WhatsApp</span>
                            <span className="text-gray-700 font-medium">{profileForm.contact_phone || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">Head Office</span>
                            <span className="text-gray-700 font-medium">{profileForm.contact_office || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-xs uppercase">Website</span>
                            <a href={profileForm.contact_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{profileForm.contact_website || "N/A"}</a>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEditingUpdates(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm font-medium whitespace-nowrap flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-semibold text-gray-700">🛡️ Insurance Plans</label>
                        <button onClick={addPlan} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Plan</button>
                      </div>
                      <div className="space-y-4">
                        {plansList.map((plan, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                            <button
                              onClick={() => removePlan(index)}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove Plan"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <div className="mb-3">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                  <input
                                    type="text"
                                    value={plan.title}
                                    onChange={(e) => updatePlan(index, "title", e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                                    placeholder="Plan Name (e.g. Gold Coverage)"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={plan.price}
                                    onChange={(e) => updatePlan(index, "price", e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="Price"
                                  />
                                  <select
                                    value={plan.currency}
                                    onChange={(e) => updatePlan(index, "currency", e.target.value)}
                                    className="bg-white border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  >
                                    {CURRENCIES.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div>
                              <textarea
                                rows={2}
                                value={plan.description}
                                onChange={(e) => updatePlan(index, "description", e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Description of the plan..."
                              />
                            </div>
                          </div>
                        ))}
                        {plansList.length === 0 && (
                          <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm">
                            No plans added yet. Click "+ Add Plan" to start.
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">📋 Coverage Summary</label>
                      <textarea
                        rows={4}
                        value={profileForm.coverage_summary}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, coverage_summary: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Summarize coverage details..."
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">📄 Claim Process</label>
                      <textarea
                        rows={4}
                        value={profileForm.claim_process}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, claim_process: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Explain the claim process..."
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-semibold text-gray-700">🏥 Partner Hospitals</label>
                        <button onClick={addHospital} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Hospital</button>
                      </div>
                      <div className="space-y-2">
                        {hospitalsList.map((hospital, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-gray-500 font-bold">➢</span>
                            <input
                              type="text"
                              value={hospital}
                              onChange={(e) => updateHospital(index, e.target.value)}
                              className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              placeholder="Hospital Name"
                            />
                            <button onClick={() => removeHospital(index)} className="text-red-500 hover:text-red-700 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                          </div>
                        ))}
                        {hospitalsList.length === 0 && <div className="text-sm text-gray-500 italic">No hospitals added.</div>}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-semibold text-gray-700">💊 Partner Pharmacies</label>
                        <button onClick={addPharmacy} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Pharmacy</button>
                      </div>
                      <div className="space-y-2">
                        {pharmaciesList.map((pharmacy, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-gray-500 font-bold">➢</span>
                            <input
                              type="text"
                              value={pharmacy}
                              onChange={(e) => updatePharmacy(index, e.target.value)}
                              className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              placeholder="Pharmacy Name"
                            />
                            <button onClick={() => removePharmacy(index)} className="text-red-500 hover:text-red-700 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                          </div>
                        ))}
                        {pharmaciesList.length === 0 && <div className="text-sm text-gray-500 italic">No pharmacies added.</div>}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-semibold text-gray-700">🏢 Office Locations</label>
                        <button onClick={addLocation} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Location</button>
                      </div>
                      <div className="space-y-4">
                        {officeLocations.map((loc, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                            <button onClick={() => removeLocation(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <select
                                value={loc.type}
                                onChange={(e) => updateLocation(index, "type", e.target.value)}
                                className="border rounded px-3 py-2 text-sm"
                              >
                                <option value="Main Office">Main Office</option>
                                <option value="Branch Office">Branch Office</option>
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
                              <div className="group relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-10">
                                  Right-click the pin on the map to see coordinates.
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const query = `${loc.address} ${loc.city}`.trim();
                                  if (!query) return toast.error("Please enter an address or city to search.");
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
                                onClick={() => handlePasteCoordinates(index)}
                                className="text-xs flex items-center gap-1 text-teal-600 hover:text-teal-800 font-medium"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Paste Coordinates
                              </button>
                              <button
                                onClick={() => handleUseCurrentLocation(index)}
                                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
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
                        ))}
                        {officeLocations.length === 0 && <div className="text-sm text-gray-500 italic">No locations added.</div>}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-semibold text-gray-700 mb-3">📞 Contact Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Support Email</label>
                          <input
                            type="email"
                            value={profileForm.contact_email}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_email: e.target.value }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="support@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone / WhatsApp</label>
                          <input
                            type="text"
                            value={profileForm.contact_phone}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="+123 456 789"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Head Office</label>
                          <input
                            type="text"
                            value={profileForm.contact_office}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_office: e.target.value.toUpperCase() }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="City, Country"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                          <input
                            type="url"
                            value={profileForm.contact_website}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_website: e.target.value }))}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => setIsEditingUpdates(false)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        disabled={isSavingProfile}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveUpdates}
                        disabled={isSavingProfile}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition flex items-center gap-2"
                      >
                        {isSavingProfile ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Saving...
                          </>
                        ) : "Save Updates"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-6 text-gray-800 text-center">My Insurance</h3>
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
                          <p className="text-gray-500 text-sm mt-1 truncate">{profileForm.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="text-center md:text-left">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">WhatsApp</h5>
                          <p className="text-gray-900 font-medium">{profileForm.whatsapp_number || "Not set"}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment ID</h5>
                          <p className="text-gray-900 font-medium">{profileForm.payment_id || "Not set"}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Country</h5>
                          <p className="text-gray-900 font-medium">{profileForm.country || "Not set"}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Origin Country</h5>
                          <p className="text-gray-900 font-medium">{profileForm.origin_country || "Not set"}</p>
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
                          <img src={getImageUrl(profileForm.image)} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-100 transition text-sm font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Change Photo
                          <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
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
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium"
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
                              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                              disabled={isSavingPassword}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handlePasswordUpdate}
                              disabled={isSavingPassword || !passwordForm.newPassword || !passwordForm.oldPassword}
                              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition flex items-center gap-2"
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