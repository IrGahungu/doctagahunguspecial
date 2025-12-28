"use client";

import { useState, useEffect } from "react";

type Insurance = {
  id: string;
  name: string;
};

type Location = {
  name: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean; // Admin sets open/closed
};

type Pharmacy = {
  id: string;
  name: string;
  email: string;
  image?: string;
  country: string;
  locations?: Location[];
  accepted_insurances?: string[];
  whatsapp_number: string;
  password?: string;
  payment_id?: string;
};

type PharmacyForm = {
  id?: string;
  name: string;
  email: string;
  image: string;
  country: string;
  locations: Location[];
  accepted_insurances: string[];
  whatsapp_number: string;
  password?: string;
  agreementImage: string;
  payment_id: string;
};

type FormErrors = Partial<Record<keyof Omit<PharmacyForm, 'id'> | 'confirmPassword', string>>;

type PharmacyPageProps = {
  editingPharmacy: Pharmacy | null;
  allInsurances: Insurance[];
};

const supportedCountries = [
  "Burundi",
  "Rwanda",
  "Tanzania",
  "Kenya",
  "Sudan",
  "Congo",
  "Somalia",
];

const sampleInsurances: Insurance[] = [
  { id: "1", name: "Radiant" },
  { id: "2", name: "Britam" },
  { id: "3", name: "UAP" },
  { id: "4", name: "Sanlam" },
  { id: "5", name: "Jubilee" },
  { id: "6", name: "Saham" },
];

export default function PharmacyPage({
  editingPharmacy,
  allInsurances,
}: PharmacyPageProps) {
  const [pharmacyForm, setPharmacyForm] = useState<PharmacyForm>({
    name: "",
    email: "",
    image: "",
    country: "Burundi",
    locations: [],
    accepted_insurances: [],
    whatsapp_number: "",
    password: "",
    agreementImage: "",
    payment_id: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isUploadingAgreement, setIsUploadingAgreement] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isInsuranceDropdownOpen, setIsInsuranceDropdownOpen] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  useEffect(() => {
    if (editingPharmacy) {
      setPharmacyForm({
        name: editingPharmacy.name || "",
        email: editingPharmacy.email || "",
        image: editingPharmacy.image || "",
        country: editingPharmacy.country || "Burundi",
        locations: editingPharmacy.locations || [],
        accepted_insurances: editingPharmacy.accepted_insurances || [],
        whatsapp_number: editingPharmacy.whatsapp_number || "",
        agreementImage: (editingPharmacy as any).agreementImage || "", // Assuming it might exist
        password: "", // Don't populate password for edits
        payment_id: editingPharmacy.payment_id || "",
      });
    } else {
      setPharmacyForm({
        name: "",
        email: "",
        image: "",
        country: "Burundi",
        locations: [],
        accepted_insurances: [],
        whatsapp_number: "",
        password: "",
        agreementImage: "",
        payment_id: "",
      });
    }
    setConfirmPassword("");
    setFormError(null);
  }, [editingPharmacy]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setPharmacyForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (name in errors) { // Type-safe check if the key exists in the errors object
      const newErrors = { ...errors };
      delete newErrors[name as keyof typeof newErrors];
      setErrors(newErrors);
    }
  }

  function handleInsuranceSelectionChange(insuranceName: string, isSelected: boolean) {
    if (!insuranceName) return;
    setPharmacyForm((prev) => {
      const currentInsurances = prev.accepted_insurances || [];
      if (isSelected) {
        if (!currentInsurances.includes(insuranceName)) {
          return { ...prev, accepted_insurances: [...currentInsurances, insuranceName] };
        }
      } else {
        return {
          ...prev,
          accepted_insurances: currentInsurances.filter((name) => name !== insuranceName),
        };
      }
      return prev;
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "pharmacy-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setPharmacyForm((prev) => ({ ...prev, image: result.publicUrl }));
      if (errors.image) {
        const newErrors = { ...errors };
        delete newErrors.image;
        setErrors(newErrors);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred during upload.";
      setFormError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAgreementImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAgreement(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "pharmacy-agreement-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setPharmacyForm((prev) => ({ ...prev, agreementImage: result.publicUrl }));
      if (errors.agreementImage) {
        const newErrors = { ...errors };
        delete newErrors.agreementImage;
        setErrors(newErrors);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed unexpectedly");
    } finally {
      setIsUploadingAgreement(false);
    }
  }

  // Small presentational helpers (kept inline to avoid extra imports)
  const FieldLabel = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-semibold text-slate-700 mb-2">
 {children}
 {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
  function validateForm(): boolean {
    const newErrors: FormErrors = {};
    if (!pharmacyForm.name) newErrors.name = "Name is required";
    if (!pharmacyForm.email) newErrors.email = "Email is required";
    if (!pharmacyForm.whatsapp_number) newErrors.whatsapp_number = "WhatsApp number is required";
    if (!pharmacyForm.payment_id) newErrors.payment_id = "Payment ID is required";
    if (!editingPharmacy && !pharmacyForm.password) newErrors.password = "Password is required";
    if (!editingPharmacy && pharmacyForm.password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!pharmacyForm.image) newErrors.image = "Pharmacy image is required";    if (!pharmacyForm.agreementImage) newErrors.agreementImage = "Agreement image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      setFormError("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = "/api/pharmacies";
      const method = editingPharmacy ? "PUT" : "POST";
      const body = editingPharmacy ? { ...pharmacyForm, id: editingPharmacy.id } : pharmacyForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          body
        ),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save Pharmacy");

      // On success, you might want to redirect the user.
      // e.g., using Next.js's router: router.push('/pharmacies');
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to save pharmacy");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-15">
          <h1 className="inline-block text-2xl font-extrabold tracking-tight text-slate-900 border-b-2 border-green-300 pb-2">
            {editingPharmacy ? "Edit Pharmacy Details" : "Pharmacy Details"}
          </h1>
        </div>

        {/* FORM */}
        <form
          id="pharmacy-form" 
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Pharmacy Name</FieldLabel>
              <input
                type="text"
                name="name"
                placeholder="e.g., City Pharmacy"
                value={pharmacyForm.name}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.name ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
            <div>
              <FieldLabel required>Email</FieldLabel>
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={pharmacyForm.email}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.email ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>Country</FieldLabel>
            <select name="country" value={pharmacyForm.country} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.country ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}>
              {supportedCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Locations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <FieldLabel required>Locations</FieldLabel>
              <button
                type="button"
                onClick={() => setPharmacyForm({ ...pharmacyForm, locations: [...pharmacyForm.locations, { name: "", openingTime: "09:00", closingTime: "17:00", isOpen: true }] })}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Add
              </button>
            </div>
            {pharmacyForm.locations.map((loc, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 mb-2">
                {/* Location Name */}
                <input
                  type="text"
                  placeholder="Location name"
                  value={loc.name}
                  onChange={(e) => {
                    const newLocs = [...pharmacyForm.locations];
                    newLocs[index].name = e.target.value;
                    setPharmacyForm({ ...pharmacyForm, locations: newLocs });
                  }}
                  className="w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />

                {/* Opening / Closing Time + Open/Closed Toggle */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[120px]"><FieldLabel>Opening Time</FieldLabel><input type="time" value={loc.openingTime} onChange={(e) => { const newLocs = [...pharmacyForm.locations]; newLocs[index].openingTime = e.target.value; setPharmacyForm({ ...pharmacyForm, locations: newLocs }); }} className="w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" /></div>
                  <div className="flex-1 min-w-[120px]"><FieldLabel>Closing Time</FieldLabel><input type="time" value={loc.closingTime} onChange={(e) => { const newLocs = [...pharmacyForm.locations]; newLocs[index].closingTime = e.target.value; setPharmacyForm({ ...pharmacyForm, locations: newLocs }); }} className="w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" /></div>
                  <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={loc.isOpen} onChange={(e) => { const newLocs = [...pharmacyForm.locations]; newLocs[index].isOpen = e.target.checked; setPharmacyForm({ ...pharmacyForm, locations: newLocs }); }} className="h-5 w-5 rounded" /><span className={`px-2 py-1 text-xs font-medium rounded text-white ${loc.isOpen ? "bg-green-500" : "bg-red-500"}`}>{loc.isOpen ? "Open" : "Closed"}</span></div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => {
                    setPharmacyForm({
                      ...pharmacyForm,
                      locations: pharmacyForm.locations.filter((_, i) => i !== index),
                    });
                  }}
                >Remove Location</button>
              </div>
            ))}
          </div>

          {/* Insurances */}
          <div>
            <FieldLabel>Accepted Insurances</FieldLabel>
            <div className="relative">
              <button
                type="button"
                className="w-full flex items-center justify-between text-left rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                onClick={() => setIsInsuranceDropdownOpen(!isInsuranceDropdownOpen)}
              >
                <span>
                  {pharmacyForm.accepted_insurances.length > 0
                    ? `${pharmacyForm.accepted_insurances.length} selected`
                    : "Select insurances"}
                </span>
                <svg
                  className={`w-5 h-5 text-black transition-transform ${
                    isInsuranceDropdownOpen ? "transform rotate-180" : ""
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isInsuranceDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {sampleInsurances.map((insurance) => (
                    <div
                      key={insurance.id}
                      className="flex items-center p-2 hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleInsuranceSelectionChange(insurance.name, !pharmacyForm.accepted_insurances.includes(insurance.name))}
                    >
                      <input
                        type="checkbox"
                        id={`insurance-${insurance.id}`}
                        checked={pharmacyForm.accepted_insurances.includes(insurance.name || "")}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        disabled={!insurance.name}
                      />
                      <label
                        htmlFor={`insurance-${insurance.id}`}
                        className="ml-3 block text-sm text-gray-900"
                      >
                        {insurance.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

           <div>
              <FieldLabel required>Payment ID</FieldLabel>
              <input
                type="text"
                name="payment_id"
                placeholder="Your Payment ID"
                value={pharmacyForm.payment_id}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.payment_id ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>

          <div>
              <FieldLabel required>WhatsApp Number</FieldLabel>
              <input
                type="text"
                name="whatsapp_number"
                placeholder="+1234567890"
                value={pharmacyForm.whatsapp_number}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.whatsapp_number ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required={!editingPharmacy}>Password</FieldLabel>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={pharmacyForm.password}
                  onChange={handleChange}
                  className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.password ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-10`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639l4.43-4.43a1.012 1.012 0 011.43 0l4.43 4.43a1.012 1.012 0 010 .639l-4.43 4.43a1.012 1.012 0 01-1.43 0l-4.43-4.43z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <FieldLabel required={!editingPharmacy}>Confirm Password</FieldLabel>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      const newErrors = { ...errors };
                      delete newErrors.confirmPassword;
                      setErrors(newErrors);
                    }
                  }}
                  className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.confirmPassword ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-10`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639l4.43-4.43a1.012 1.012 0 011.43 0l4.43 4.43a1.012 1.012 0 010 .639l-4.43 4.43a1.012 1.012 0 01-1.43 0l-4.43-4.43z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <FieldLabel required>Pharmacy Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{isUploading ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
              </label>
              {pharmacyForm.image && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={pharmacyForm.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Agreement Image upload */}
          <div>
            <FieldLabel required>Upload Agreement Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.agreementImage ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isUploadingAgreement ? "Uploading..." : "Choose agreement"}</span>
                <input type="file" accept="image/*" onChange={handleAgreementImageUpload} className="hidden" />
              </label>

              {pharmacyForm.agreementImage && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={pharmacyForm.agreementImage} alt="Agreement Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="terms" className="text-sm text-slate-600 select-none">
              I agree to the{" "}
              <a href="#" className="text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>
                terms and conditions
              </a>{" "}
              of Dr. Gahungu.
            </label>
          </div>

          {/* Footer */}
          <div className="pt-4">
            {formError && <p className="text-red-500 text-sm text-center mb-4">{formError}</p>}
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setFormError(null)} className="px-4 py-2 rounded-md border border-slate-200 text-sm hover:bg-slate-50">Cancel</button>
              <button
                type="submit"
                form="pharmacy-form"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || isUploading || isUploadingAgreement || !agreedToTerms}
              >
                {isSubmitting ? "Submitting..." : "Submit Form"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
