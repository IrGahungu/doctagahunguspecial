"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useLanguage } from "../../../context/LanguageContext";

type Insurance = {
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
};

type InsuranceForm = {
  id?: string;
  name: string;
  image: string;
  country: string;
  origin_country: string;
  email: string;
  whatsapp_number: string;
  password?: string;
  payment_id: string;
};

type InsurancePageProps = {
  editingInsurance: Insurance | null;
};

type FormErrors = Partial<Record<keyof Omit<InsuranceForm, 'id'> | 'confirmPassword', string>>

const supportedCountries = [
  "Burundi",
  //"Rwanda",
  //"Tanzania",
  //"Kenya",
  //"Sudan",
  //"Congo",
  //"Somalia",
];

const getImageUrl = (path: string | null | undefined) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/insurance-images/${path}`;
};

function InsurancePageContent({ editingInsurance: initialInsurance }: InsurancePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(initialInsurance);
  const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>({
    name: "",
    image: "",
    country: "Burundi",
    origin_country: "",
    email: "",
    whatsapp_number: "",
    password: "",
    payment_id: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { t } = useLanguage();
  const [isViewMode, setIsViewMode] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const applicationStatus = editingInsurance?.status;
  const rejectionReason = editingInsurance?.rejection_reason;

  useEffect(() => {
      const id = searchParams.get("id");
      if (id) {
        fetch(`/api/insurance/apply?id=${id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && !data.error) {
              setEditingInsurance(data);
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
    if (editingInsurance) {
      setInsuranceForm({
        name: editingInsurance.name || "",
        image: editingInsurance.image || "",
        country: editingInsurance.country || "Burundi",
        origin_country: editingInsurance.origin_country || "",
        email: editingInsurance.email || "",
        whatsapp_number: editingInsurance.whatsapp_number || "",
        password: "", // Always clear password on load
        payment_id: editingInsurance.payment_id || "",
      });
    } else {
      setInsuranceForm({
        name: "", 
        image: "", 
        country: "Burundi", 
        origin_country: "", 
        email: "", 
        whatsapp_number: "", 
        password: "", 
        payment_id: ""
    });
    }
    setConfirmPassword("");
    setFormError(null);
    setPasswordStrength(0);
  }, [editingInsurance]);

  const passwordRequirements = [
    { key: "atLeast8Chars" as const, met: (insuranceForm.password || "").length >= 8 },
    { key: "oneCapitalLetter" as const, met: /[A-Z]/.test(insuranceForm.password || "") },
    { key: "oneSpecialChar" as const, met: /[!@#$%^&*(),.?":{}|<>]/.test(insuranceForm.password || "") },
    { key: "atLeast3Numbers" as const, met: ((insuranceForm.password || "").match(/\d/g) || []).length >= 3 },
  ];

  const getPasswordStrengthScore = (password: string) => {
    let score = 0;
    if (password.length === 0) return 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    if ((password.match(/\d/g) || []).length >= 3) score++;
    return score;
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setInsuranceForm((prev) => ({ ...prev, [name]: value }));
    if (name in errors) {
      const newErrors = { ...errors } as FormErrors;
      delete newErrors[name as keyof FormErrors];
      setErrors(newErrors);
    }

    if (name === "password") {
      setPasswordStrength(getPasswordStrengthScore(value));
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setInsuranceForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
    if (errors.image) {
      const newErrors = { ...errors };
      delete newErrors.image;
      setErrors(newErrors);
    }
  }

  const FieldLabel = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
  
  
  function validateForm(): boolean {
    const newErrors: FormErrors = {}; // Explicitly type newErrors
    if (!insuranceForm.name) newErrors.name = t.insuranceNameRequired;
    if (!insuranceForm.origin_country) newErrors.origin_country = t.originCountryRequired;
    if (!insuranceForm.email) newErrors.email = t.emailRequired;
    if (!insuranceForm.whatsapp_number) newErrors.whatsapp_number = t.whatsappNumberRequired;
    if (!insuranceForm.payment_id) newErrors.payment_id = t.paymentIdRequired;
    if (!editingInsurance) {
      if (!insuranceForm.password) {
        newErrors.password = t.passwordRequired;
      } else {
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=(?:.*\d){3,}).{8,}$/;
        if (!passwordRegex.test(insuranceForm.password)) {
          newErrors.password = t.passwordRequirementsCombined;
        }
      }
    }
    if (!editingInsurance && insuranceForm.password !== confirmPassword) newErrors.confirmPassword = t.passwordsDoNotMatch;
    if (!insuranceForm.image) newErrors.image = t.insuranceImageRequired;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) toast.error(t.fillAllFieldsAndCorrectErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function executeSubmission() {
    setFormError(null);

    if (!validateForm()) { // Call validateForm to set errors
      return;
    }

    setIsSubmitting(true);
    
    try {
      const url = "/api/insurance/apply";
      const method = editingInsurance ? "PUT" : "POST";
      
      const formData = new FormData();
      if (editingInsurance) formData.append("id", editingInsurance.id);
      formData.append("name", insuranceForm.name);
      formData.append("country", insuranceForm.country);
      formData.append("origin_country", insuranceForm.origin_country);
      formData.append("email", insuranceForm.email);
      formData.append("whatsapp_number", insuranceForm.whatsapp_number);
      formData.append("payment_id", insuranceForm.payment_id);
      if (insuranceForm.password) formData.append("password", insuranceForm.password);

      if (imageFile) formData.append("image", imageFile);
      else if (insuranceForm.image && !insuranceForm.image.startsWith("blob:")) formData.append("image", insuranceForm.image);

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) { // If response is not JSON, it's likely a plain text error or success
        if (!res.ok) {
          const msg = text || `${t.serverError} (${res.status})`;
          toast.error(msg);
          setFormError(msg);
          return;
        }
        const msg = `${t.serverError} (${res.status}): ${t.invalidJsonResponse}`;
        toast.error(msg);
        setFormError(msg);
        return;
      }
      if (!res.ok) {
        const msg = result.error || t.serverError;
        toast.error(msg);
        setFormError(msg);
        return;
      }
      
      toast.success(editingInsurance 
        ? t.applicationResubmittedSuccess 
        : t.applicationSubmittedSuccess);
      setTimeout(() => {
        router.push("/login");
      }, 4000);
      } catch (err:any) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to save insurance";
      setFormError(msg);
      toast.error(msg);
      } finally {
      setShowConfirmModal(false); // Close modal on submission attempt
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      return;
    }
    setShowConfirmModal(true);
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster />
      <div className="w-full max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-15">
          <h1 className="inline-block text-2xl font-extrabold tracking-tight text-slate-900 border-b-2 border-green-300 pb-2">
            {isViewMode ? t.myInsuranceDetails : (editingInsurance ? t.editYourApplication : t.insuranceDetails)}
          </h1>
        </div>

        {applicationStatus === 'rejected' && rejectionReason && (
          <div className="my-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800">{t.needsAttention}</h3>
            <p className="text-sm text-red-700 mt-1">
              <span className="font-semibold">{t.rejectionReasonLabel}</span> {rejectionReason}
            </p>
            <p className="text-sm text-red-700 mt-2">{t.rejectionInstructions}</p>
          </div>
        )}

        {isViewMode && editingInsurance ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-slate-50 border-b border-slate-200">
              <h3 className="text-lg leading-6 font-medium text-slate-900">{t.applicationInformation}</h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">{t.personalDetailsAndApplication}</p>
              <button
                onClick={() => setIsViewMode(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {t.update}
              </button>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"> {/* Added div for consistent styling */}
                  <dt className="text-sm font-medium text-gray-500">{t.insuranceName}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingInsurance.name}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">{t.image}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {editingInsurance.image && (
                      <img src={getImageUrl(editingInsurance.image)} alt={t.insuranceImage} className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">{t.country}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingInsurance.country}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">{t.originCountry}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingInsurance.origin_country}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">{t.email}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingInsurance.email}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">{t.whatsappNumber}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingInsurance.whatsapp_number}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">{t.password}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">********</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">{t.paymentId}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{editingInsurance.payment_id}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
        <>
        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t.confirmDetailsTitle}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t.confirmDetailsMessage}
                </p>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Name:</span> <span className="font-bold text-slate-900">{insuranceForm.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="font-bold text-slate-900">{insuranceForm.email}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">WhatsApp:</span> <span className="font-bold text-slate-900">{insuranceForm.whatsapp_number}</span></div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t.edit}
                </button>
                <button
                  onClick={executeSubmission}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? t.submitting : t.confirmAndSubmit}
                </button>
              </div>
            </div>
          </div>
        )}
        <form id="insurance-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>{t.insuranceName}</FieldLabel>
              <input type="text" name="name" placeholder={t.insuranceNamePlaceholder} value={insuranceForm.name} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.name ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`} />
            </div>
            <div>
              <FieldLabel required>{t.originCountry}</FieldLabel>
              <input type="text" name="origin_country" placeholder={t.originCountryPlaceholder} value={insuranceForm.origin_country} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.origin_country ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`} />
            </div>
            <div>
              <FieldLabel required>{t.email}</FieldLabel>
              <input
                type="email"
                name="email"
                placeholder={t.hospitalEmailPlaceholder}
                value={insuranceForm.email}
                onChange={handleChange}
                disabled={!!editingInsurance}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.email ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${editingInsurance ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <FieldLabel required>{t.whatsappNumber}</FieldLabel>
              <input
                type="text"
                name="whatsapp_number"
                placeholder={t.whatsappHintHospital}
                value={insuranceForm.whatsapp_number}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.whatsapp_number ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
            <div>
              <FieldLabel required>{t.paymentId}</FieldLabel>
              <input
                type="text"
                name="payment_id"
                placeholder={t.paymentIdPlaceholder}
                value={insuranceForm.payment_id}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.payment_id ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>{t.country}</FieldLabel>
            <select name="country" value={insuranceForm.country} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.country ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}>
              {supportedCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {!editingInsurance && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div> {/* Password field */}
                <FieldLabel required>{t.password}</FieldLabel>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password" // Corrected name attribute
                    placeholder={t.passwordPlaceholderHospital}
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
                {/* Password Strength Meter */}
                {!editingInsurance && insuranceForm.password && (
                  <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-in-out"
                      style={{
                        width: `${(passwordStrength / 4) * 100}%`,
                        backgroundColor:
                          passwordStrength === 0 ? 'transparent' :
                          passwordStrength <= 1 ? '#ef4444' : // Red for weak
                          passwordStrength <= 2 ? '#f97316' : // Orange for medium
                          passwordStrength <= 3 ? '#eab308' : // Yellow for good
                          '#22c55e', // Green for strong
                      }}
                    ></div>
                  </div>
                )}
                {!editingInsurance && insuranceForm.password && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4"> {/* Password requirements */}
                    {passwordRequirements.map((req, i) => (
                      <div key={i} className={`flex items-center text-[11px] transition-colors duration-200 ${req.met ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                        <div className={`mr-2 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${req.met ? 'bg-green-100 border-green-500 text-green-600' : 'border-slate-200 text-transparent'}`}>
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        {t[req.key]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div> {/* Confirm Password field */}
                <FieldLabel required>{t.confirmPassword}</FieldLabel>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword" // Corrected name attribute
                    placeholder={t.confirmPasswordPlaceholder}
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
            <FieldLabel required>{t.insuranceImage}</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{t.chooseImage}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {insuranceForm.image && ( // Image preview
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={getImageUrl(insuranceForm.image)} alt="Preview" className="w-full h-full object-cover" />
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
              {t.iAgreeToThe}{" "}
              <a href="#" className="text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>
                {t.termsAndConditions}
              </a>{" "}
              {t.ofDrGahungu}
            </label>
          </div>

          <div className="pt-4">
            {formError && <p className="text-red-500 text-sm text-center mb-4">{formError}</p>} {/* Display form-wide error */}
            <div className="flex justify-center gap-3">
              <button type="button"
                onClick={() => {
                  setInsuranceForm({
                    name: "",
                    image: "",
                    country: "Burundi",
                    origin_country: "",
                    email: editingInsurance ? insuranceForm.email : "", // Preserve email if editing
                    whatsapp_number: "",
                    password: "",
                    payment_id: "",
                    id: insuranceForm.id, // Preserve ID if editing
                  });
                  setConfirmPassword("");
                  setImageFile(null);
                  setAgreedToTerms(false);
                  setErrors({});
                  setPasswordStrength(0);
                  setFormError(null);
                }} className="px-4 py-2 rounded-md border border-slate-200 text-sm hover:bg-slate-50 cursor-pointer">{t.cancel}</button>
              <button
                type="submit"
                form="insurance-form"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={isSubmitting || !agreedToTerms}
              >
                {isSubmitting ? t.submitting : (editingInsurance ? t.resubmitForm : t.submitForm)}
              </button>
            </div>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}

export default function InsurancePage(props: InsurancePageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InsurancePageContent {...props} />
    </Suspense>
  );
}