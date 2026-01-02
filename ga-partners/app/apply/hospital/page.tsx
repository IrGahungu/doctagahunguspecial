"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Hospital = {
  id: string;
  name: string;
  image?: string;
  country: string;
  origin_country?: string;
  email?: string;
  status?: string;
  rejection_reason?: string;
  whatsapp_number: string;
  password?: string;
  payment_id?: string;
  agreement_image?: string;
};

type HospitalForm = {
  id?: string;
  name: string;
  image: string;
  country: string;
  origin_country: string;
  email: string;
  whatsapp_number: string;
  password?: string;
  agreementImage: string;
  payment_id: string;
};

type FormErrors = Partial<Record<keyof Omit<HospitalForm, 'id'> | 'confirmPassword', string>>

const supportedCountries = [
  "Burundi",
  //"Rwanda",
  //"Tanzania",
  //"Kenya",
  //"Sudan",
  //"Congo",
  //"Somalia",
];

export default function HospitalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [hospitalForm, setHospitalForm] = useState<HospitalForm>({
    name: "",
    image: "",
    country: "Burundi",
    origin_country: "",
    email: "",
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
  const [isViewMode, setIsViewMode] = useState(false);

  const applicationStatus = editingHospital?.status;
  const rejectionReason = editingHospital?.rejection_reason;

  useEffect(() => {
      const id = searchParams.get("id");
      if (id) {
        fetch(`/api/hospital/apply?id=${id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && !data.error) {
              setEditingHospital(data);
              if (data.status === 'rejected') {
                setIsViewMode(false);
              } else {
                setIsViewMode(true);
              }
            }
          })
          .catch((err) => console.error("Failed to fetch application:", err));
      }
    }, [searchParams]);

  useEffect(() => {
    if (editingHospital) {
      setHospitalForm({
        name: editingHospital.name || "",
        image: editingHospital.image || "",
        country: editingHospital.country || "Burundi",
        origin_country: editingHospital.origin_country || "",
        email: editingHospital.email || "",
        whatsapp_number: editingHospital.whatsapp_number || "",
        password: "", // Always clear password on load
        agreementImage: editingHospital.agreement_image || (editingHospital as any).agreementImage || "",
        payment_id: editingHospital.payment_id || "",
      });
    } else {
      setHospitalForm({
        name: "", 
        image: "", 
        country: "Burundi", 
        origin_country: "", 
        email: "", 
        whatsapp_number: "", 
        password: "", 
        agreementImage: "", 
        payment_id: ""
    });
    }
    setConfirmPassword("");
    setFormError(null);
  }, [editingHospital]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setHospitalForm((prev) => ({ ...prev, [name]: value }));
    if (name in errors) {
      const newErrors = { ...errors } as FormErrors;
      delete newErrors[name as keyof FormErrors];
      setErrors(newErrors);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "hospital-images"); // Specify the target bucket

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server error (${res.status}): Invalid JSON response`);
      }

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setHospitalForm((prev) => ({ ...prev, image: result.publicUrl }));
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
    formData.append("bucket", "hospital-agreement-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server error (${res.status}): Invalid JSON response`);
      }
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
    if (!hospitalForm.origin_country) newErrors.origin_country = "Origin country is required";
    if (!hospitalForm.email) newErrors.email = "Email is required";
    if (!hospitalForm.whatsapp_number) newErrors.whatsapp_number = "WhatsApp number is required";
    if (!hospitalForm.payment_id) newErrors.payment_id = "Payment ID is required";
    if (!editingHospital && !hospitalForm.password) newErrors.password = "Password is required";
    if (!editingHospital && hospitalForm.password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!hospitalForm.image) newErrors.image = "Hospital image is required";
    if (!hospitalForm.agreementImage) newErrors.agreementImage = "Agreement image is required";

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
    const url = "/api/hospital/apply";
      const method = editingHospital ? "PUT" : "POST";
      const body = editingHospital ? { ...hospitalForm, id: editingHospital.id } : hospitalForm;
      
      // If editing and password is empty, remove it so we don't overwrite with empty string
      if (editingHospital && !body.password) delete (body as any).password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          body
        ),
      });

      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server error (${res.status}): Invalid JSON response`);
      }
      if (!res.ok) throw new Error(result.error || "Failed to save Hospital");

      toast.success(editingHospital 
        ? "Application resubmitted successfully, please login to check the status" 
        : "Application Submitted Successfully, please login to check the status");
      setTimeout(() => {
        router.push("/login");
      }, 4000);
    } catch (err:any) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to save hospital");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster />
      <div className="w-full max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-15">
          <h1 className="inline-block text-2xl font-extrabold tracking-tight text-slate-900 border-b-2 border-green-300 pb-2">
            {isViewMode ? "My Hospital Details" : (editingHospital ? "Edit your application" : "Hospital Details")}
          </h1>
        </div>

        {applicationStatus === 'rejected' && rejectionReason && (
          <div className="my-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800">Your Application Needs Attention</h3>
            <p className="text-sm text-red-700 mt-1">
              <span className="font-semibold">Reason for rejection:</span> {rejectionReason}
            </p>
            <p className="text-sm text-red-700 mt-2">Please review your information, make the necessary changes, and resubmit your application.</p>
          </div>
        )}

        {isViewMode && editingHospital ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-slate-50 border-b border-slate-200">
              <div>
                <h3 className="text-lg leading-6 font-medium text-slate-900">Application Information</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">Personal details and application.</p>
              </div>
              <button
                onClick={() => setIsViewMode(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Update
              </button>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Hospital Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingHospital.name}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Image</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editingHospital.image && (
                      <img src={editingHospital.image} alt="Hospital" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Country</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingHospital.country}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Origin Country</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingHospital.origin_country}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingHospital.email}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">WhatsApp Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingHospital.whatsapp_number}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Password</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">********</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Agreement Image</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {(editingHospital.agreement_image || (editingHospital as any).agreementImage) && (
                      <img 
                        src={editingHospital.agreement_image || (editingHospital as any).agreementImage} 
                        alt="Agreement" 
                        className="h-24 w-24 object-cover rounded-lg border border-gray-200" 
                      />
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Payment ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingHospital.payment_id}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (

        <form id="hospital-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Hospital Name</FieldLabel>
              <input type="text" name="name" placeholder="e.g., Radiant Hospital" value={hospitalForm.name} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.name ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`} />
            </div>
            <div>
              <FieldLabel required>Origin Country</FieldLabel>
              <input type="text" name="origin_country" placeholder="e.g., Burundi" value={hospitalForm.origin_country} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.origin_country ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`} />
            </div>
            <div>
              <FieldLabel required>Email</FieldLabel>
              <input
                type="email"
                name="email"
                placeholder="hospital@example.com"
                value={hospitalForm.email}
                onChange={handleChange}
                disabled={!!editingHospital}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.email ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${editingHospital ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
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

          {!editingHospital && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Password</FieldLabel>
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
                <FieldLabel required>Confirm Password</FieldLabel>
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
          )}

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
                form="hospital-form"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || isUploading || isUploadingAgreement || !agreedToTerms}
              >
                {isSubmitting ? "Submitting..." : "Submit Form"}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}