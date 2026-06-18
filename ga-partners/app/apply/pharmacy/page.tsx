"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { useLanguage } from "../../../context/LanguageContext";

type Pharmacy = {
  id: string;
  name: string;
  email: string;
  image?: string;
  country: string;
  origin_country?: string;
  whatsapp_number: string;
  password?: string;
  payment_id?: string;
  status?: string;
  rejection_reason?: string;
};

type PharmacyForm = {
  id?: string;
  name: string;
  email: string;
  image: string;
  country: string;
  originCountry: string;
  whatsapp_number: string;
  password?: string;
  payment_id: string;
};

type PharmacyPageProps = {
  editingPharmacy: Pharmacy | null;
};

type FormErrors = Partial<Record<keyof Omit<PharmacyForm, 'id'> | 'confirmPassword', string>>;

const supportedCountries = [
  "Burundi",
  //"Rwanda",
  //"Tanzania",
  //"Kenya",
  //"Sudan",
  //"Congo",
  //"Somalia",
];

function PharmacyPageContent({ editingPharmacy: initialPharmacy }: PharmacyPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(initialPharmacy);
  const [pharmacyForm, setPharmacyForm] = useState<PharmacyForm>({
    name: "",
    email: "",
    image: "",
    country: "Burundi",
    originCountry: "",
    whatsapp_number: "",
    password: "",
    payment_id: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [files, setFiles] = useState<{ image?: File }>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { t } = useLanguage();

  const applicationStatus = editingPharmacy?.status;
  const rejectionReason = editingPharmacy?.rejection_reason;

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      fetch(`/api/pharmacy/apply?id=${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setEditingPharmacy(data);
          }
        })
        .catch((err) => console.error("Failed to fetch application:", err));
    }
  }, [searchParams]);

  useEffect(() => {
    if (editingPharmacy) {
      setPharmacyForm({
        name: editingPharmacy.name || "",
        email: editingPharmacy.email || "",
        image: editingPharmacy.image || "",
        country: editingPharmacy.country || "Burundi",
        originCountry: editingPharmacy.origin_country || "",
        whatsapp_number: editingPharmacy.whatsapp_number || "",
        password: "", // Don't populate password for edits
        payment_id: editingPharmacy.payment_id || "",
      });
    } else {
      setPharmacyForm({
        name: "",
        email: "",
        image: "",
        country: "Burundi",
        originCountry: "",
        whatsapp_number: "",
        password: "",
        payment_id: "",
      });
    }
    setConfirmPassword("");
    setFormError(null);
    setPasswordStrength(0);
  }, [editingPharmacy]);

  const passwordRequirements = [
    { label: t.atLeast8Chars, met: (pharmacyForm.password || "").length >= 8 },
    { label: t.oneCapitalLetter, met: /[A-Z]/.test(pharmacyForm.password || "") },
    { label: t.oneSpecialChar, met: /[!@#$%^&*(),.?":{}|<>]/.test(pharmacyForm.password || "") },
    { label: t.atLeast3Numbers, met: ((pharmacyForm.password || "").match(/\d/g) || []).length >= 3 },
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

    if (name === "password") {
      setPasswordStrength(getPasswordStrengthScore(value));
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFiles((prev) => ({ ...prev, image: file }));
    setPharmacyForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));

    if (errors.image) {
      const newErrors = { ...errors };
      delete newErrors.image;
      setErrors(newErrors);
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
    if (!pharmacyForm.name) newErrors.name = t.pharmacyNameRequired;
    if (!pharmacyForm.email) newErrors.email = t.emailRequired;
    if (!pharmacyForm.whatsapp_number) newErrors.whatsapp_number = t.whatsappNumberRequired;
    if (!pharmacyForm.originCountry) newErrors.originCountry = t.originCountryRequired;
    if (!pharmacyForm.payment_id) newErrors.payment_id = t.paymentIdRequired;
    if (!editingPharmacy) {
      if (!pharmacyForm.password) {
        newErrors.password = t.passwordRequired;
      } else {
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=(?:.*\d){3,}).{8,}$/;
        if (!passwordRegex.test(pharmacyForm.password)) {
          newErrors.password = t.passwordRequirementsCombined;
        }
      }
    }
    if (pharmacyForm.password && pharmacyForm.password !== confirmPassword) newErrors.confirmPassword = t.passwordsDoNotMatch;
    if (!pharmacyForm.image) newErrors.image = t.pharmacyImageRequired;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) toast.error(t.fillAllFieldsAndCorrectErrors);
    return Object.keys(newErrors).length === 0;
  }

  const getImageUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pharmacy-images/${path}`;
  };

  async function executeSubmission() {
    setIsSubmitting(true);

    try {
      const url = "/api/pharmacy/apply";
      const method = editingPharmacy ? "PUT" : "POST";
      
      const formData = new FormData();
      formData.append("name", pharmacyForm.name);
      formData.append("email", pharmacyForm.email);
      formData.append("whatsapp_number", pharmacyForm.whatsapp_number);
      formData.append("country", pharmacyForm.country);
      formData.append("origin_country", pharmacyForm.originCountry);
      formData.append("payment_id", pharmacyForm.payment_id);
      if (pharmacyForm.password) formData.append("password", pharmacyForm.password);

      if (editingPharmacy) {
        formData.append("id", editingPharmacy.id);
        formData.append("status", "pending");
      }

      if (files.image) formData.append("image", files.image);
      else if (pharmacyForm.image) formData.append("image", pharmacyForm.image);

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        const msg = `Server error (${res.status}): Invalid JSON response`;
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

      toast.success(
        editingPharmacy ? t.applicationUpdatedSuccess : t.applicationSubmittedSuccess
      );
      setTimeout(() => {
        setShowConfirmModal(false);
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : t.unexpectedError;
      setFormError(msg);
      toast.error(msg);
    } finally {
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
      <Toaster position="top-center" />

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
              <div className="flex justify-between"><span className="text-slate-500">Name:</span> <span className="font-bold text-slate-900">{pharmacyForm.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="font-bold text-slate-900">{pharmacyForm.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">WhatsApp:</span> <span className="font-bold text-slate-900">{pharmacyForm.whatsapp_number}</span></div>
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

      <div className="w-full max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-15">
          <h1 className="inline-block text-2xl font-extrabold tracking-tight text-slate-900 border-b-2 border-green-300 pb-2">
            {editingPharmacy ? t.editPharmacyDetails : t.pharmacyDetails}
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

        {/* FORM */}
        <form
          id="pharmacy-form" 
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>{t.pharmacyName}</FieldLabel>
              <input
                type="text"
                name="name"
                placeholder={t.pharmacyNamePlaceholder}
                value={pharmacyForm.name}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.name ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
            <div>
              <FieldLabel required>{t.email}</FieldLabel>
              <input
                type="email"
                name="email"
                placeholder="pharmacy@example.com"
                value={pharmacyForm.email}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.email ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>{t.country}</FieldLabel>
              <select name="country" value={pharmacyForm.country} onChange={handleChange} className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.country ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}>
                {supportedCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel required>{t.originCountry}</FieldLabel>
              <input
                type="text"
                name="originCountry"
                placeholder={t.originCountryPlaceholder}
                value={pharmacyForm.originCountry}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.originCountry ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          </div>

           <div>
              <FieldLabel required>{t.paymentId}</FieldLabel>
              <input
                type="text"
                name="payment_id"
                placeholder={t.paymentIdPlaceholder}
                value={pharmacyForm.payment_id}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.payment_id ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>

          <div>
              <FieldLabel required>{t.whatsappNumber}</FieldLabel>
              <input
                type="text"
                name="whatsapp_number"
                placeholder={t.whatsappHintHospital}
                value={pharmacyForm.whatsapp_number}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.whatsapp_number ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>

          {!editingPharmacy && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>{t.password}</FieldLabel>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder={t.passwordPlaceholderHospital}
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
                {/* Password Strength Meter */}
                {!editingPharmacy && pharmacyForm.password && (
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
                {!editingPharmacy && pharmacyForm.password && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                    {passwordRequirements.map((req, i) => (
                      <div key={i} className={`flex items-center text-[11px] transition-colors duration-200 ${req.met ? 'text-green-600 font-medium' : 'text-slate-400'}`}>
                        <div className={`mr-2 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${req.met ? 'bg-green-100 border-green-500 text-green-600' : 'border-slate-200 text-transparent'}`}>
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
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
            <FieldLabel required>{t.pharmacyImage}</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{isUploading ? t.updating : t.chooseImage}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
              </label>
              {pharmacyForm.image && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={getImageUrl(pharmacyForm.image)} alt="Preview" className="w-full h-full object-cover" />
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
              {t.iAgreeToThe}{" "}
              <a href="#" className="text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>
                {t.termsAndConditions}
              </a>{" "}
              {t.ofDrGahungu}
            </label>
          </div>

          {/* Footer */}
          <div className="pt-4">
            {formError && <p className="text-red-500 text-sm text-center mb-4">{formError}</p>}
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPharmacyForm({
                    name: "",
                    email: editingPharmacy ? pharmacyForm.email : "",
                    image: "",
                    country: "Burundi",
                    originCountry: "",
                    whatsapp_number: "",
                    password: "",
                    payment_id: "",
                    id: pharmacyForm.id,
                  });
                  setConfirmPassword("");
                  setFiles({});
                  setAgreedToTerms(false);
                  setErrors({});
                  setPasswordStrength(0);
                  setFormError(null);
                }}
                className="px-4 py-2 rounded-md border border-slate-200 text-sm hover:bg-slate-50 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                form="pharmacy-form"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={isSubmitting || isUploading || !agreedToTerms}
              >
                {isSubmitting ? t.submitting : (editingPharmacy ? t.resubmitForm : t.submitForm)}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PharmacyPage(props: PharmacyPageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PharmacyPageContent {...props} />
    </Suspense>
  );
}
