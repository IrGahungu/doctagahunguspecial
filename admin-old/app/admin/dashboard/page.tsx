"use client";

import UsersTable from "@/app/components/UsersTable"
import OrdersTable from "@/app/components/OrdersTable";
import CategoryModal from "@/app/components/CategoryModal";
import HospitalModal from "@/app/components/HospitalModal";
import PharmacyModal from "@/app/components/PharmacyModal";
import InsuranceModal from "@/app/components/InsuranceModal";
import BannerModal from "@/app/components/BannerModal";
import DealModal from "@/app/components/DealModal";
import DoctorModal from "@/app/components/DoctorModal";
import MedicineModal from "@/app/components/MedicineModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  userId: string;
  fullname: string;
  whatsapp_number: string;
  country: string;
  gender: string;
  role: "admin" | "user";
  wallet_balance: string;
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
  pharmacies?: any[] | null;
};

export default function AdminDashboard() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);
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
      const data = await res.json();
      if (transform) {
        setter(transform(data));
      } else {
        setter(data);
      }
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
    }
  }

  const fetchCategories = () => fetchData("/api/admin/users?type=categories", setCategories);
  const fetchPharmacies = () =>
    fetchData("/api/admin/users?type=pharmacies", setPharmacies);
  const fetchHospitals = () =>
    fetchData("/api/admin/users?type=hospitals", setHospitals, (data) =>
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
  const fetchInsurances = () => fetchData("/api/admin/users?type=insurances", setInsurances);
  const fetchBanners = () => fetchData("/api/admin/users?type=banners", setBanners);
  const fetchDeals = () => fetchData("/api/admin/users?type=deals", setDeals);
  const fetchDoctors = () =>
    fetchData("/api/admin/users?type=doctors", setDoctors, (data) =>
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
    fetchData("/api/admin/users?type=medicines", setMedicines, (data) =>
      (Array.isArray(data) ? data : (data as any).medicines || []).map((med: any) => ({
        ...med,
        pharmacies: (med.medicine_pharmacies || []).map((mp: any) => ({
          id: mp.pharmacy_id,
          locations: mp.locations,
          insurances: mp.insurances,
        })),
      }))
    );

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
    }
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
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAllModals();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout");
      router.push("/admin/login");
    } catch (error) {
      console.error("Failed to sign out", error);
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
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete category");

      fetchCategories();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete category");
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
    try {
      const res = await fetch(`/api/pharmacies?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete pharmacy");

      fetchPharmacies();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete pharmacy");
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
    try {
      const res = await fetch(`/api/hospitals?id=${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete hospital");
      fetchHospitals();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete hospital");
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
    setEditingBanner(banner);
    setBannerModalOpen(true);
  }

  function handleBannerSaveSuccess() {
    fetchBanners();
    closeAllModals();
  }

  async function handleBannerDelete(id: string) {
    if (!confirm("Delete this banner?")) return;
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
    setEditingDeal(deal);
    setDealModalOpen(true);
  }

  function handleDealSaveSuccess() {
    fetchDeals();
    closeAllModals();
  }

  async function handleDealDelete(id: string) {
    if (!confirm("Delete this deal?")) return;
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
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          {user?.fullname && <p className="text-md text-gray-600 mt-1">Welcome, {user.fullname}</p>}
        </div>
        <button onClick={handleSignOut} className="p-2 text-red-600 rounded-full hover:bg-gray-200 transition-colors" title="Sign Out">
          ⏻
        </button>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button
          onClick={() => setActiveView("users")}
          className={`p-3 text-sm font-semibold bg-blue-500 text-white rounded-lg transition-all ${activeView === 'users' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Users
        </button>
        <button
          onClick={() => setActiveView("orders")}
          className={`p-3 text-sm font-semibold bg-gray-500 text-white rounded-lg transition-all ${activeView === 'orders' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Orders
        </button>
        <button
          onClick={() => setActiveView("medicines")}
          className={`p-3 text-sm font-semibold bg-indigo-500 text-white rounded-lg transition-all ${activeView === "medicines"
              ? "ring-2 ring-offset-2 ring-black"
              : ""
            }`}
        >
          Manage Medicines
        </button>
        <button
          onClick={() => setActiveView("categories")}
          className={`p-3 text-sm font-semibold bg-yellow-500 text-white rounded-lg transition-all ${activeView === 'categories' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Categories
        </button>
        <button
          onClick={() => setActiveView("pharmacies")}
          className={`p-3 text-sm font-semibold bg-purple-500 text-white rounded-lg transition-all ${activeView === 'pharmacies' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Pharmacies
        </button>
        <button
          onClick={() => setActiveView("hospitals")}
          className={`p-3 text-sm font-semibold bg-green-500 text-white rounded-lg transition-all ${activeView === 'hospitals' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Hospitals
        </button>
        <button
          onClick={() => setActiveView("insurances")}
          className={`p-3 text-sm font-semibold bg-teal-500 text-white rounded-lg transition-all ${activeView === 'insurances' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Insurances
        </button>
        <button
          onClick={() => setActiveView("banners")}
          className={`p-3 text-sm font-semibold bg-red-500 text-white rounded-lg transition-all ${activeView === 'banners' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Banners
        </button>
        <button
          onClick={() => setActiveView("deals")}
          className={`p-3 text-sm font-semibold bg-orange-500 text-white rounded-lg transition-all ${activeView === 'deals' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Deals
        </button>
        <button
          onClick={() => setActiveView("doctors")}
          className={`p-3 text-sm font-semibold bg-cyan-500 text-white rounded-lg transition-all ${activeView === 'doctors' ? 'ring-2 ring-offset-2 ring-black' : ''}`}
        >
          Manage Doctors
        </button>
      </div>

      {/* Welcome Message on initial load */}
      {activeView === null && (
        <div className="text-center p-10 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold">Welcome back MSC. IT. ENG. JEAN KEVIN GAHUNGU</h2>
        </div>
      )}

      {/* Users */}
      {activeView === "users" && <UsersTable />}

      {/* Orders */}
      {activeView === "orders" && <OrdersTable />}

      {/* Medicines */}
      {activeView === "medicines" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Manage Medicines</h2>
            <button
              onClick={openAddMedicineModal}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-700"
            >
              + Add Medicine
            </button>
          </div>

          <table className="w-full text-left text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Image</th>
                <th className="p-2">Name</th>
                <th className="p-2">Title</th>
                <th className="p-2">Price</th>
                <th className="p-2">Category</th>
                <th className="p-2">Available In</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => (
                <tr key={med.id} className="border-t">
                  <td className="p-2">
                    {med.image ? (
                      <img src={med.image} alt={med.title} className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <span className="text-gray-400">No Image</span>
                    )}
                  </td>
                  <td className="p-2">{med.name}</td>
                  <td className="p-2">{med.title}</td>
                  <td className="p-2">₹{med.price}</td>
                  <td className="p-2">{categories.find(c => c.id === med.category_id)?.name || 'N/A'}</td>
                  <td className="p-2 max-w-sm">
                    {(!med.pharmacies || med.pharmacies.length === 0) ? (
                      <span className="text-xs text-gray-500">Not available</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {med.pharmacies.map((medPharm: any) => {
                          const pharmacy = pharmacies.find(p => p.id === medPharm.id);
                          if (!pharmacy) return null;
                          return (
                            <div key={medPharm.id}>
                              <span className="font-semibold text-sm">{pharmacy.name}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {medPharm.locations?.length > 0 ? (
                                  medPharm.locations.map((loc: string) => (
                                    <span key={loc} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                                      {loc}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400 italic">All locations</span>
                                )}
                                {medPharm.insurances?.map((ins: string) => (
                                  <span key={ins} className="px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded-full">
                                    {ins}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-2 space-x-2">
                    <button onClick={() => openEditMedicineModal(med)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleMedicineDelete(med.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {medicines.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">No medicines found</td>
                </tr>
              )}
            </tbody>
          </table>

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

          <table className="w-full text-left text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Emoji</th>
                <th className="p-2">Name</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-t">
                  <td className="p-2 text-xl">{cat.image}</td>
                  <td className="p-2">{cat.name}</td>
                  <td className="p-2 space-x-2">
                    <button
                      onClick={() => openEditCategoryModal(cat)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleCategoryDelete(cat.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
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
                <tr key={phar.id} className="border-t">
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
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {pharmacies.length === 0 && (
                <tr>
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
                <tr key={hosp.id} className="border-t">
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
                    <button onClick={() => handleHospitalDelete(hosp.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {hospitals.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">
                    No hospitals found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
                <tr key={ins.id} className="border-t">
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
                    <button onClick={() => handleInsuranceDelete(ins.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {insurances.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    No insurances found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
                <tr key={banner.id} className="border-t">
                  <td className="p-2">
                    {banner.image ? (
                      <img src={banner.image} alt={'Banner image'} className="w-48 h-auto object-contain rounded" />
                    ) : (
                      <span className="text-gray-400">No Image</span>
                    )}
                  </td>
                  <td className="p-2">{banner.link}</td>
                  <td className="p-2 space-x-2">
                    <button onClick={() => openEditBannerModal(banner)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleBannerDelete(banner.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-500">
                    No banners found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
                <tr key={deal.id} className="border-t">
                  <td className="p-2">
                    {deal.image ? (
                      <img src={deal.image} alt={'Deal image'} className="w-24 h-auto object-contain rounded" />
                    ) : (
                      <span className="text-gray-400">No Image</span>
                    )}
                  </td>
                  <td className="p-2">{deal.title}</td>
                  <td className="p-2">{deal.discount}</td>
                  <td className="p-2">{deal.tagline}</td>
                  <td className="p-2 space-x-2">
                    <button onClick={() => openEditDealModal(deal)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDealDelete(deal.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No deals found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
                <tr key={doc.id} className="border-t">
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
                    <button onClick={() => handleDoctorDelete(doc.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {doctors.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">
                    No doctors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <DoctorModal
            isOpen={doctorModalOpen}
            onClose={closeAllModals}
            editingDoctor={editingDoctor}
            onSuccess={handleDoctorSaveSuccess}
          />
        </div>
      )}
    </div>
  );
}
