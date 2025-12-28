"use client";

import { useState, useEffect } from "react";

type Specialty = {
  name: string;
  openingHours: string;
};

type Hospital = {
  id: string;
  name: string;
  email: string;
  image?: string;
  location?: string[];
  specialties?: Specialty[];
  departments?: string[];
  insurances?: string[];
  blood_types?: string[];
  country: string;
  whatsapp_number: string;
  emergency_contact_number: string;
  password?: string;
  payment_id?: string;
};

type HospitalForm = {
  id?: string;
  name: string;
  email: string;
  image: string;
  location: string[];
  specialties: Specialty[];
  departments: string[];
  insurances: string[];
  blood_types: string[];
  country: string;
  whatsapp_number: string;
  emergency_contact_number: string;
  password?: string;
  agreementImage: string;
  payment_id: string;
};

type FormErrors = Partial<Record<keyof Omit<HospitalForm, 'id'> | 'confirmPassword', string>>;

type HospitalListField = "location" | "departments" | "insurances" | "blood_types";

type HospitalPageProps = {
  editingHospital: Hospital | null;
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

export default function HospitalPage({
  editingHospital,
}: HospitalPageProps) {
  const [hospitalForm, setHospitalForm] = useState<HospitalForm>({
    name: "",
    email: "",
    image: "",
    location: [],
    specialties: [],
    departments: [],
    insurances: [],
    blood_types: [],
    country: "Burundi",
    whatsapp_number: "",
    emergency_contact_number: "",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (editingHospital) {
      setHospitalForm({
        name: editingHospital.name || "",
        email: editingHospital.email || "",
        image: editingHospital.image || "",
        location: editingHospital.location || [],
        specialties: editingHospital.specialties || [],
        departments: editingHospital.departments || [],
        insurances: editingHospital.insurances || [],
        blood_types: editingHospital.blood_types || [],
        country: editingHospital.country || "Burundi",
        whatsapp_number: editingHospital.whatsapp_number || "",
        emergency_contact_number: editingHospital.emergency_contact_number || "",
        password: "", // Don't populate password for edits
        agreementImage: (editingHospital as any).agreementImage || "",
        payment_id: editingHospital.payment_id || "",
      });
    } else {
      setHospitalForm({
        name: "",
        email: "",
        image: "",
        location: [],
        specialties: [],
        departments: [],
        insurances: [],
        blood_types: [],
        country: "Burundi",
        whatsapp_number: "",
        emergency_contact_number: "",
        password: "",
        agreementImage: "",
        payment_id: "",
      });
    }
    setConfirmPassword("");
    setFormError(null);
    setErrors({});
  }, [editingHospital]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setHospitalForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (name in errors) {
      const newErrors = { ...errors } as FormErrors;
      delete newErrors[name as keyof FormErrors];
      setErrors(newErrors);
    }
  }

  function handleListChange(field: HospitalListField, index: number, value: string) {
    const updatedList = [...hospitalForm[field]];
    updatedList[index] = value;
    setHospitalForm((prev) => ({ ...prev, [field]: updatedList }));
  }

  function handleSpecialtyChange(index: number, field: 'name' | 'openingHours', value: string) {
    const updatedList = [...hospitalForm.specialties];
    updatedList[index][field] = value;
    setHospitalForm((prev) => ({ ...prev, specialties: updatedList }));
  }

  function addListItem(field: HospitalListField) {
    setHospitalForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  }

  function removeListItem(field: HospitalListField, index: number) {
    setHospitalForm((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  }

  function addSpecialty() {
    setHospitalForm((prev) => ({ ...prev, specialties: [...prev.specialties, { name: "", openingHours: "" }] }));
  }

  function removeSpecialty(index: number) {
    setHospitalForm((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "hospital-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setHospitalForm((prev) => ({ ...prev, image: result.publicUrl }));
      if (errors.image) {
        const newErrors = { ...errors };
        delete newErrors.image;
        setErrors(newErrors);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Image upload failed");
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
    formData.append("bucket", "hospital-agreement-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setHospitalForm((prev) => ({ ...prev, agreementImage: result.publicUrl }));
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

  const FieldLabel = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  function validateForm(): boolean {
    const newErrors: FormErrors = {};
    if (!hospitalForm.name) newErrors.name = "Hospital name is required";
    if (!hospitalForm.email) newErrors.email = "Email is required";
    if (!hospitalForm.whatsapp_number) newErrors.whatsapp_number = "WhatsApp number is required";
    if (!hospitalForm.emergency_contact_number) newErrors.emergency_contact_number = "Emergency contact number is required";
    if (!hospitalForm.payment_id) newErrors.payment_id = "Payment ID is required";
    if (!editingHospital && !hospitalForm.password) newErrors.password = "Password is required";
    if (!editingHospital && hospitalForm.password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!hospitalForm.image) newErrors.image = "Hospital image is required";
    if (!hospitalForm.agreementImage) newErrors.agreementImage = "Agreement image is required";
    if (hospitalForm.location.filter(l => l.trim()).length === 0) newErrors.location = "At least one location is required";
    if (hospitalForm.specialties.filter(s => s.name.trim()).length === 0) newErrors.specialties = "At least one specialty is required";

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
      const url = "/api/hospitals";
      const method = editingHospital ? "PUT" : "POST";
      const payload = editingHospital
        ? { ...hospitalForm, id: editingHospital.id }
        : hospitalForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save data");
      // On success, you might want to redirect the user.
      // e.g., using Next.js's router: router.push('/hospitals');
    } catch {
      setFormError("Error saving hospital");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-12">
          <h1 className="inline-block text-2xl font-extrabold tracking-tight text-slate-900 border-b-2 border-green-300 pb-2">
            {editingHospital ? "Edit Hospital" : "Welcome Hospital"}
          </h1>
        </div>

        <form
          id="hospital-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Hospital Name</FieldLabel>
              <input
                type="text"
                name="name"
                placeholder="e.g., Central Hospital"
                value={hospitalForm.name}
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
                value={hospitalForm.email}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.email ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>Country</FieldLabel>
            <select name="country" value={hospitalForm.country} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.country ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}>
              {supportedCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Specialties */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <FieldLabel required>Specialties</FieldLabel>
              <button
                type="button"
                onClick={addSpecialty}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Add
              </button>
            </div>
            <div className="space-y-2">
              {hospitalForm.specialties.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Specialty Name"
                    value={item.name}
                    onChange={(e) => handleSpecialtyChange(index, 'name', e.target.value)}
                    className="flex-1 rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <input
                    type="text"
                    placeholder="Opening Hours (e.g., 9am-5pm)"
                    value={item.openingHours}
                    onChange={(e) => handleSpecialtyChange(index, 'openingHours', e.target.value)}
                    className="flex-1 rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecialty(index)}
                    className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                    aria-label="Remove Specialty"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic List Sections */}
          {[
            { field: "location", label: "Locations" },
            { field: "departments", label: "Departments" },
            { field: "insurances", label: "Insurances" },
            { field: "blood_types", label: "Blood Types" },
          ].map(({ field, label }) => {
            const typedField = field as HospitalListField;
            return (
            <div key={field}>
              <div className="flex items-center justify-between mb-3">
                <FieldLabel required={field === 'location'}>{label}</FieldLabel>
                <button
                  type="button"
                  onClick={() => addListItem(typedField)}
                  className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {hospitalForm[typedField].map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={label.slice(0, -1)}
                      value={item}
                      onChange={(e) => handleListChange(typedField, index, e.target.value)}
                      className="flex-1 rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem(typedField, index)}
                      className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                      aria-label={`Remove ${label.slice(0, -1)}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )})}

          <div>
              <FieldLabel required>Payment ID</FieldLabel>
              <input
                type="text"
                name="payment_id"
                placeholder="Your Payment ID"
                value={hospitalForm.payment_id}
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
                value={hospitalForm.whatsapp_number}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.whatsapp_number ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          
          <div>
              <FieldLabel required>Emergency Contact Number</FieldLabel>
              <input
                type="text"
                name="emergency_contact_number"
                placeholder="+1234567890"
                value={hospitalForm.emergency_contact_number}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.emergency_contact_number ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required={!editingHospital}>Password</FieldLabel>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={hospitalForm.password}
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
              <FieldLabel required={!editingHospital}>Confirm Password</FieldLabel>
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
            <FieldLabel required>Hospital Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{isUploading ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
              </label>
              {hospitalForm.image && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={hospitalForm.image} alt="Preview" className="w-full h-full object-cover" />
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

              {hospitalForm.agreementImage && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={hospitalForm.agreementImage} alt="Agreement Preview" className="w-full h-full object-cover" />
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
                form="hospital-form"
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
