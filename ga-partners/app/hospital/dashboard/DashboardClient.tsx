"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type HospitalApplication = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  image?: string | null;
};

interface DashboardClientProps {
  app: HospitalApplication;
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

export default function DashboardClient({ app }: DashboardClientProps) {
  const [showStatus, setShowStatus] = useState(false);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingUpdates, setIsEditingUpdates] = useState(false);

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
    service_summary: "",
    admission_process: "",
    partner_insurances: "",
    partner_pharmacies: "",
    contact_email: "",
    contact_phone: "",
    contact_office: "",
    contact_website: "",
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [insurancesList, setInsurancesList] = useState<string[]>([]);
  const [pharmaciesList, setPharmaciesList] = useState<string[]>([]);
  const [Locations, setLocations] = useState<{ type: string; city: string; address: string; phone: string; latitude: string; longitude: string }[]>([]);
  const [availableServices, setAvailableServices] = useState<{ name: string; description: string }[]>([]);
  const [availableBloodTypes, setAvailableBloodTypes] = useState<string[]>([]);
  const [medicalEquipment, setMedicalEquipment] = useState<{ name: string; status: string }[]>([]);


  const statusColorMap = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-red-500",
  };

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/Hospital/logout", { method: "POST" });
      router.refresh();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
      router.push("/login");
    }
  }

  const handleNavClick = (tab: string) => {
    if (app.status !== "approved" && tab !== "status") {
      alert("You have to get approved first");
      return;
    }
    setActiveTab(tab);
    if (tab === "status") setShowStatus(true);
  };

  useEffect(() => {
    if ((activeTab === "profile" || activeTab === "updates") && app.id) {
      setIsProfileLoading(true);
      fetch(`/api/hospital/apply?id=${app.id}`)
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

          let parsedInsurances: string[] = [];
          try {
            if (data.partner_insurances && data.partner_insurances.trim().startsWith("[")) {
              parsedInsurances = JSON.parse(data.partner_insurances);
            } else if (data.partner_insurances) {
              parsedInsurances = data.partner_insurances.split('\n').map((s: string) => s.replace(/^➢\s*/, '').trim()).filter(Boolean);
            }
          } catch (e) { parsedInsurances = []; }
          setInsurancesList(parsedInsurances);

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
            if (data.locations) {
              parsedLocations =
                typeof data.locations === "string"
                  ? JSON.parse(data.locations)
                  : data.locations;
            }
          } catch {
            parsedLocations = [];
          }
          setLocations(parsedLocations);

          let parsedServices: any[] = [];
          try {
            if (data.available_services) {
              parsedServices = JSON.parse(data.available_services);
            }
          } catch (e) { parsedServices = []; }
          setAvailableServices(parsedServices);

          let parsedBloodTypes: string[] = [];
          try {
            if (data.available_blood_types) {
              parsedBloodTypes = JSON.parse(data.available_blood_types);
            }
          } catch (e) { parsedBloodTypes = []; }
          setAvailableBloodTypes(parsedBloodTypes);

          let parsedEquipment: any[] = [];
          try {
            if (data.medical_equipment) {
              parsedEquipment = JSON.parse(data.medical_equipment);
            }
          } catch (e) { parsedEquipment = []; }
          setMedicalEquipment(parsedEquipment);

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
            service_summary: data.service_summary || "",
            admission_process: data.admission_process || "",
            partner_insurances: data.partner_insurances || "",
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

    setIsUploadingProfileImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "hospital-images");

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

    const contactJson = JSON.stringify({
      email: profileForm.contact_email,
      phone: profileForm.contact_phone,
      office: profileForm.contact_office,
      website: profileForm.contact_website
    });

    const updateData = { ...profileForm, id: app.id, contact_details: contactJson };
    if (!updateData.password) {
      delete (updateData as any).password;
    }
    delete (updateData as any).confirmPassword;
    delete (updateData as any).contact_email;
    delete (updateData as any).contact_phone;
    delete (updateData as any).contact_office;
    delete (updateData as any).contact_website;
    delete (updateData as any).service_summary;
    delete (updateData as any).admission_process;
    delete (updateData as any).partner_insurances;
    delete (updateData as any).partner_pharmacies;

    try {
      const res = await fetch(`/api/hospital/apply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
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


  function addInsurance() { setInsurancesList([...insurancesList, ""]); }
  function removeInsurance(index: number) { setInsurancesList(insurancesList.filter((_, i) => i !== index)); }
  function updateInsurance(index: number, value: string) {
    const list = [...insurancesList];
    list[index] = value;
    setInsurancesList(list);
  }

  function addPharmacy() { setPharmaciesList([...pharmaciesList, ""]); }
  function removePharmacy(index: number) { setPharmaciesList(pharmaciesList.filter((_, i) => i !== index)); }
  function updatePharmacy(index: number, value: string) {
    const list = [...pharmaciesList];
    list[index] = value;
    setPharmaciesList(list);
  }

  function addLocation() { setLocations([...Locations, { type: "Main Location", city: "", address: "", phone: "", latitude: "", longitude: "" }]); }
  function removeLocation(index: number) { setLocations(Locations.filter((_, i) => i !== index)); }
  function updateLocation(index: number, field: string, value: string) {
    const list = [...Locations];
    if (field === "city" || field === "address") {
      (list[index] as any)[field] = value.toUpperCase();
    } else {
      (list[index] as any)[field] = value;
    }
    setLocations(list);
  }

  function handleUseCurrentLocation(index: number) {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const list = [...Locations];
      list[index].latitude = position.coords.latitude.toFixed(6);
      list[index].longitude = position.coords.longitude.toFixed(6);
      setLocations(list);
    }, (err) => alert("Could not retrieve location: " + err.message));
  }

  async function handlePasteCoordinates(index: number) {
    try {
      const text = await navigator.clipboard.readText();
      const matches = text.match(/-?\d+(\.\d+)?/g);
      if (matches && matches.length >= 2) {
        const list = [...Locations];
        list[index].latitude = matches[0];
        list[index].longitude = matches[1];
        setLocations(list);
      } else {
        alert("Could not find valid coordinates (e.g., '-1.95, 30.06') in clipboard.");
      }
    } catch (err) {
      alert("Failed to read clipboard.");
    }
  }

  function addService() { setAvailableServices([...availableServices, { name: "", description: "" }]); }
  function removeService(index: number) { setAvailableServices(availableServices.filter((_, i) => i !== index)); }
  function updateService(index: number, field: "name" | "description", value: string) {
    const list = [...availableServices];
    list[index][field] = value;
    setAvailableServices(list);
  }

  function addBloodType() { setAvailableBloodTypes([...availableBloodTypes, ""]); }
  function removeBloodType(index: number) { setAvailableBloodTypes(availableBloodTypes.filter((_, i) => i !== index)); }
  function updateBloodType(index: number, value: string) {
    const list = [...availableBloodTypes];
    list[index] = value;
    setAvailableBloodTypes(list);
  }

  function addEquipment() { setMedicalEquipment([...medicalEquipment, { name: "", status: "Operational" }]); }
  function removeEquipment(index: number) { setMedicalEquipment(medicalEquipment.filter((_, i) => i !== index)); }
  function updateEquipment(index: number, field: "name" | "status", value: string) {
    const list = [...medicalEquipment];
    (list[index] as any)[field] = value;
    setMedicalEquipment(list);
  }

  async function handleSaveUpdates() {
    setIsSavingProfile(true);

    const insurancesJson = JSON.stringify(insurancesList);
    const pharmaciesJson = JSON.stringify(pharmaciesList);
    const locationsJson = Locations;
    const servicesJson = JSON.stringify(availableServices);
    const bloodTypesJson = JSON.stringify(availableBloodTypes);
    const equipmentJson = JSON.stringify(medicalEquipment);
    const contactJson = JSON.stringify({
      email: profileForm.contact_email,
      phone: profileForm.contact_phone,
      office: profileForm.contact_office,
      website: profileForm.contact_website
    });

    const updateData = {
      ...profileForm,
      id: app.id,
      contact_details: contactJson,
      partner_insurances: insurancesJson,
      partner_pharmacies: pharmaciesJson,
      locations: locationsJson,
      available_services: servicesJson,
      available_blood_types: bloodTypesJson,
      medical_equipment: equipmentJson
    };
    delete (updateData as any).password;
    delete (updateData as any).confirmPassword;
    delete (updateData as any).contact_email;
    delete (updateData as any).contact_phone;
    delete (updateData as any).contact_office;
    delete (updateData as any).contact_website;
    delete (updateData as any).name;
    delete (updateData as any).email;
    delete (updateData as any).whatsapp_number;
    delete (updateData as any).country;
    delete (updateData as any).origin_country;
    delete (updateData as any).payment_id;
    delete (updateData as any).image;

    try {
      const res = await fetch(`/api/hospital/apply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) throw new Error("Failed to update information");
      alert("Information updated successfully!");
      router.refresh();
      setIsEditingUpdates(false);
    } catch (e) {
      console.error(e);
      alert("Error updating information");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
              <span className="hidden md:block">My Hospital</span>
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
                          router.push(`/apply/hospital?id=${app.id}`);
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
                <h3 className="text-xl font-bold mb-6 text-gray-800">Hospital Updates</h3>
                {isProfileLoading ? (
                  <div className="text-center py-10">Loading updates...</div>
                ) : !isEditingUpdates ? (
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 w-full bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6">

                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">📋 Services Summary</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{profileForm.service_summary || "No service summary available."}</p>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🧾 Patient Admission & Treatment Process</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{profileForm.admission_process || "No admission process details available."}</p>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🛠️ Available Services</h4>
                        {availableServices.length > 0 ? (
                          <div className="space-y-3">
                            {availableServices.map((s, i) => (
                              <div key={i} className="bg-white p-3 rounded border border-gray-100">
                                <p className="font-bold text-gray-800">{s.name}</p>
                                <p className="text-sm text-gray-600">{s.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-gray-500 italic">No services listed.</p>}
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🩸 Available Blood Types</h4>
                        {availableBloodTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {availableBloodTypes.map((b, i) => (
                              <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-100">
                                {b}
                              </span>
                            ))}
                          </div>
                        ) : <p className="text-gray-500 italic">No blood types listed.</p>}
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🩺 Medical Equipment</h4>
                        {medicalEquipment.length > 0 ? (
                          <div className="space-y-3">
                            {medicalEquipment.map((e, i) => (
                              <div key={i} className="bg-white p-3 rounded border border-gray-100 flex justify-between items-center">
                                <span className="font-bold text-gray-800">{e.name}</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium border ${e.status === 'Operational' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                  {e.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-gray-500 italic">No medical equipment listed.</p>}
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🏥 Partner Insurances</h4>
                        {insurancesList.length > 0 ? (
                          <ul className="list-none space-y-1">
                            {insurancesList.map((h, i) => <li key={i} className="text-gray-600">➢ {h}</li>)}
                          </ul>
                        ) : <p className="text-gray-500 italic">No partner insurances listed.</p>}
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
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-2">🏢 Locations</h4>
                        {Locations.length > 0 ? (
                          <div className="space-y-3">
                            {Locations.map((loc, i) => (
                              <div key={i} className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-100">
                                <p className="font-bold text-gray-800">{loc.type} - {loc.city}</p>
                                <p>{loc.address}</p>
                                {loc.phone && <p>📞 {loc.phone}</p>}
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-gray-500 italic">No locations listed.</p>}
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
                      <label className="block font-semibold text-gray-700 mb-1">📋 Services Summary</label>
                      <textarea
                        rows={4}
                        value={profileForm.service_summary}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, service_summary: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Summarize service details..."
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">🧾 Patient Admission & Treatment Process</label>
                      <textarea
                        rows={4}
                        value={profileForm.admission_process}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, admission_process: e.target.value }))}
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Explain the admission process..."
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-semibold text-gray-700">🛠️ Available Services</label>
                        <button onClick={addService} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Service</button>
                      </div>
                      <div className="space-y-3">
                        {availableServices.map((service, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 relative">
                            <button onClick={() => removeService(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                            <div className="mb-2">
                              <input
                                type="text"
                                value={service.name}
                                onChange={(e) => updateService(index, "name", e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Service Name"
                              />
                            </div>
                            <div>
                              <textarea
                                rows={2}
                                value={service.description}
                                onChange={(e) => updateService(index, "description", e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Description"
                              />
                            </div>
                          </div>
                        ))}
                        {availableServices.length === 0 && <div className="text-sm text-gray-500 italic">No services added.</div>}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-semibold text-gray-700">🩸 Available Blood Types</label>
                        <button onClick={addBloodType} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Blood Type</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableBloodTypes.map((bt, index) => (
                          <div key={index} className="flex items-center gap-1 bg-gray-50 border rounded-lg px-2 py-1">
                            <input
                              type="text"
                              value={bt}
                              onChange={(e) => updateBloodType(index, e.target.value)}
                              className="w-16 bg-transparent border-none focus:ring-0 text-sm p-0"
                              placeholder="Type"
                            />
                            <button onClick={() => removeBloodType(index)} className="text-red-400 hover:text-red-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      {availableBloodTypes.length === 0 && <div className="text-sm text-gray-500 italic">No blood types added.</div>}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-semibold text-gray-700">🩺 Medical Equipment</label>
                        <button onClick={addEquipment} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Equipment</button>
                      </div>
                      <div className="space-y-3">
                        {medicalEquipment.map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 relative flex gap-3 items-center pr-10">
                            <button onClick={() => removeEquipment(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateEquipment(index, "name", e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Equipment Name"
                              />
                            </div>
                            <div className="w-1/3">
                              <select
                                value={item.status}
                                onChange={(e) => updateEquipment(index, "status", e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              >
                                <option value="Operational">Operational</option>
                                <option value="Maintenance">Maintenance</option>
                              </select>
                            </div>
                          </div>
                        ))}
                        {medicalEquipment.length === 0 && <div className="text-sm text-gray-500 italic">No equipment added.</div>}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block font-semibold text-gray-700">🏥 Partner Insurances</label>
                        <button onClick={addInsurance} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Insurance</button>
                      </div>
                      <div className="space-y-2">
                        {insurancesList.map((insurance, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-gray-500 font-bold">➢</span>
                            <input
                              type="text"
                              value={insurance}
                              onChange={(e) => updateInsurance(index, e.target.value)}
                              className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              placeholder="Insurance Name"
                            />
                            <button onClick={() => removeInsurance(index)} className="text-red-500 hover:text-red-700 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                          </div>
                        ))}
                        {insurancesList.length === 0 && <div className="text-sm text-gray-500 italic">No insurances added.</div>}
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
                        <label className="block font-semibold text-gray-700">🏢 Locations</label>
                        <button onClick={addLocation} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add Location</button>
                      </div>
                      <div className="space-y-4">
                        {Locations.map((loc, index) => (
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
                        {Locations.length === 0 && <div className="text-sm text-gray-500 italic">No locations added.</div>}
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
                            onChange={(e) => setProfileForm(prev => ({ ...prev, contact_office: e.target.value }))}
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
                <h3 className="text-xl font-bold mb-6 text-gray-800">My Hospital</h3>
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
                        <div>
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