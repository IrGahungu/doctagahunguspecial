"use client";

import { useState, useEffect } from "react";

type InsurancePlan = {
  type: string;
  price: number;
  description: string;
  coverage: string[];
};

type InsuranceLocation = {
  location: string;
  // plans are now managed separately at the top level
};

type Insurance = {
  id: string;
  name: string;
  image?: string;
  country: string;
  locations?: string[]; // Changed to simple strings
  plans?: InsurancePlan[];

  whatsapp_number: string;
  password?: string;
  payment_id?: string;
};

type InsuranceForm = {
  id?: string;
  name: string;
  image: string;
  country: string;
  locations: string[];

  plans: InsurancePlan[];
  whatsapp_number: string;
  password?: string;
  agreementImage: string;
  payment_id: string;
};

type FormErrors = Partial<Record<keyof Omit<InsuranceForm, 'id' | 'locations' | 'plans'> | 'confirmPassword' | 'locations' | 'plans', string>>


type InsurancePageProps = {
  editingInsurance: Insurance | null;
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

export default function InsurancePage({
  editingInsurance,
}: InsurancePageProps) {
  const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>({
    name: "",
    image: "",
    country: "Burundi",
    locations: [],

    plans: [],
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (editingInsurance) {
      setInsuranceForm({
        name: editingInsurance.name || "",
        image: editingInsurance.image || "",
        country: editingInsurance.country || "Burundi",
        locations: (editingInsurance.locations as unknown as string[]) || [], // Adjust type
        plans: editingInsurance.plans || [],

        whatsapp_number: editingInsurance.whatsapp_number || "",
        password: "", // Always clear password on load
        agreementImage: (editingInsurance as any).agreementImage || "",
        payment_id: editingInsurance.payment_id || "",
      });
    } else {
      setInsuranceForm(prev => ({
        ...prev, name: "", image: "", country: "Burundi", locations: [], plans: [], whatsapp_number: "", password: "", agreementImage: "", payment_id: ""
      }));
    }
    setConfirmPassword("");
    setFormError(null);
    setErrors({});
  }, [editingInsurance]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setInsuranceForm((prev) => ({ ...prev, [name]: value }));
    if (name in errors) {
      const newErrors = { ...errors } as FormErrors;
      delete newErrors[name as keyof FormErrors];
      setErrors(newErrors);
    }
  }

  function handleLocationChange(index: number, value: string) {
    const newLocations = [...insuranceForm.locations];
    newLocations[index] = value;
    setInsuranceForm(prev => ({ ...prev, locations: newLocations }));
  }

  function handlePlanChange(index: number, field: keyof InsurancePlan, value: string | number | string[]) {
    const newPlans: InsurancePlan[] = [...insuranceForm.plans];
    const planToUpdate = newPlans[index];

    if (field === 'coverage' && typeof value === 'string') {
      planToUpdate.coverage = value.split(',').map(item => item.trim());
    } else if (field === 'price') {
      const parsedValue = parseFloat(value as string);
      planToUpdate.price = isNaN(parsedValue) ? 0 : parsedValue;
    } else if (field === 'type' && typeof value === 'string') {
      planToUpdate.type = value;
    } else if (field === 'description' && typeof value === 'string') {
      planToUpdate.description = value;
    }

    setInsuranceForm(prev => ({ ...prev, plans: newPlans }));
  }

  function addLocation() {
    setInsuranceForm(prev => ({
      ...prev,
      locations: [...prev.locations, ""]
    }));
  }

  function removeLocation(index: number) {
    setInsuranceForm(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  }

  function addPlan() {
    setInsuranceForm(prev => ({ ...prev, plans: [...prev.plans, { type: "", price: 0, description: "", coverage: [] }] }));
  }

  function removePlan(index: number) {
    setInsuranceForm(prev => ({ ...prev, plans: prev.plans.filter((_, i) => i !== index) }));
  }


  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "insurance-images"); // Specify the target bucket

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setInsuranceForm((prev) => ({ ...prev, image: result.publicUrl }));
      if (errors.image) {
        const newErrors = { ...errors };
        delete newErrors.image;
        setErrors(newErrors);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred during upload.";
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
    formData.append("bucket", "insurance-agreement-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setInsuranceForm((prev) => ({ ...prev, agreementImage: result.publicUrl }));
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
    if (!insuranceForm.name) newErrors.name = "Insurance name is required";
    if (!insuranceForm.whatsapp_number) newErrors.whatsapp_number = "WhatsApp number is required";
    if (!insuranceForm.payment_id) newErrors.payment_id = "Payment ID is required";
    if (!editingInsurance && !insuranceForm.password) newErrors.password = "Password is required";
    if (!editingInsurance && insuranceForm.password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!insuranceForm.image) newErrors.image = "Insurance image is required";
    if (!insuranceForm.agreementImage) newErrors.agreementImage = "Agreement image is required";
    if (insuranceForm.locations.filter(l => l.trim()).length === 0) {
      newErrors.locations = "At least one location is required.";
    }
    if (insuranceForm.plans.length === 0) {
      newErrors.plans = "At least one plan is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      setFormError("Please fill out all required fields and correct any errors.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create a clean payload without temporary properties like 'rawJson'
      const payload = {
        ...insuranceForm,
        locations: insuranceForm.locations.filter(l => l.trim() !== ''),
        plans: insuranceForm.plans.map(p => ({
          type: p.type, price: p.price, description: p.description, coverage: p.coverage
        })),
      };
      
      const url = "/api/insurances";
      const method = editingInsurance ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( // Use the cleaned payload
          editingInsurance
            ? { ...payload, id: editingInsurance.id }
            : payload
        ),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save Insurance");

      // On success, you might want to redirect the user.
      // e.g., using Next.js's router: router.push('/insurances');
    } catch (err:any) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to save insurance");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-12">
          <h1 className="inline-block text-2xl font-extrabold tracking-tight text-slate-900 border-b-2 border-green-300 pb-2">
            {editingInsurance ? "Edit Insurance" : "Welcome Insurance"}
          </h1>
        </div>

        <form id="insurance-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Insurance Name</FieldLabel>
              <input type="text" name="name" placeholder="e.g., Radiant Insurance" value={insuranceForm.name} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.name ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`} />
            </div>
            <div>
              <FieldLabel required>WhatsApp Number</FieldLabel>
              <input
                type="text"
                name="whatsapp_number"
                placeholder="+1234567890"
                value={insuranceForm.whatsapp_number}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.whatsapp_number ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
            <div>
              <FieldLabel required>Payment ID</FieldLabel>
              <input
                type="text"
                name="payment_id"
                placeholder="Your Payment ID"
                value={insuranceForm.payment_id}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.payment_id ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>Country</FieldLabel>
            <select name="country" value={insuranceForm.country} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.country ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}>
              {supportedCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required={!editingInsurance}>Password</FieldLabel>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={insuranceForm.password}
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
              <FieldLabel required={!editingInsurance}>Confirm Password</FieldLabel>
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

          <div id="locations-section">
            <div className="flex items-center justify-between mb-3">
              <FieldLabel required>Locations</FieldLabel>
              <button
                type="button"
                onClick={addLocation}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Add
              </button>
            </div>
            <div className="space-y-2">
              {insuranceForm.locations.map((loc, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Location Name (e.g., Bujumbura)"
                    value={loc}
                    onChange={(e) => handleLocationChange(index, e.target.value)}
                    className={`flex-1 rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.locations ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
                  />
                  <button type="button" onClick={() => removeLocation(index)} className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 hover:bg-red-100" aria-label="Remove Location">×</button>
                </div>
              ))}
            </div>
            {errors.locations && <p className="text-sm text-red-600 mt-2">{errors.locations}</p>}
          </div>

          <div id="plans-section">
            <div className="flex items-center justify-between mb-3">
              <FieldLabel required>Plans</FieldLabel>
              <button
                type="button"
                onClick={addPlan}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Add
              </button>
            </div>
            <div className="space-y-4">
              {insuranceForm.plans.map((plan, index:number) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 bg-slate-50/50">
                  <FieldLabel>Plan #{index + 1}</FieldLabel>
                  <input
                    type="text"
                    placeholder="Plan Type (e.g., Gold, Silver)"
                    value={plan.type}
                    onChange={(e) => handlePlanChange(index, "type", e.target.value)}
                    className="w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <input
                    type="number"
                    placeholder="Price (e.g., 50000)"
                    value={plan.price}
                    onChange={(e) => handlePlanChange(index, "price", e.target.value)}
                    className="w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={plan.description}
                    onChange={(e) => handlePlanChange(index, "description", e.target.value)}
                    className="w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  <input
                    type="text"
                    placeholder="Coverage (comma-separated, e.g., item1, item2)"
                    value={plan.coverage?.join(", ") ?? ""}
                    onChange={(e) => handlePlanChange(index, "coverage", e.target.value)}
                    className="w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />

                  <button type="button" onClick={() => removePlan(index)} className="text-sm text-red-600 hover:underline">
                    Remove Plan
                  </button>
                </div>
              ))}
            </div>
            {errors.plans && <p className="text-sm text-red-600 mt-2">{errors.plans}</p>}
          </div>

          <div>
            <FieldLabel required>Insurance Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{isUploading ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
              </label>
              {insuranceForm.image && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={insuranceForm.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

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
              {insuranceForm.agreementImage && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={insuranceForm.agreementImage} alt="Agreement Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

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

          <div className="pt-4">
            {formError && <p className="text-red-500 text-sm text-center mb-4">{formError}</p>}
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setFormError(null)} className="px-4 py-2 rounded-md border border-slate-200 text-sm hover:bg-slate-50">Cancel</button>
              <button
                type="submit"
                form="insurance-form"
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