"use client";

import { Toaster, toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type Availability = {
  date: string; // "2025-09-10"
  times: string[]; // ["09:00", "10:00"]
};

type Doctor = {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  location?: string[];
  bio?: string;
  booking_type?: "online" | "in-office" | "both";
  availability: Availability[];
  image?: string;
  country: string;
  originCountry?: string; // New field
  whatsapp_number: string;
  password?: string;
  payment_id?: string;
  consultation_fee_online?: string;
  consultation_fee_offline?: string;
};

type ApplicationData = Doctor & { status: ApplicationStatus; rejection_reason: string | null; id: string };
type ApplicationStatus = "pending" | "approved" | "rejected";

type DoctorForm = Omit<Doctor, "id"> & {
  location: string[];
  id?: string; // Add optional id to the form state
};

type FormErrors = Partial<Record<keyof DoctorForm | 'confirmPassword', string>>;

type DoctorPageProps = {
  editingDoctor: ApplicationData | null;
};

const supportedCountries = [
  "Burundi",
  //"Rwanda",
  //"Tanzania",
  //"Kenya",
  //"Sudan",
  //"Congo",
  //"Somalia",
];

export default function DoctorPage({ editingDoctor }: DoctorPageProps) {
  const router = useRouter();
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [doctorForm, setDoctorForm] = useState<DoctorForm>({
    name: "",
    email: "",
    specialty: "",
    location: [],
    bio: "",
    booking_type: "online",
    availability: [],
    image: "",
    country: "Burundi",
    originCountry: "",
    whatsapp_number: "",
    password: "",
    payment_id: "",
    consultation_fee_online: "",
    consultation_fee_offline: "",
    id: undefined, // Initialize id
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [files, setFiles] = useState<{
    image?: File;
  }>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // State for password strength

  useEffect(() => {
    async function fetchByIdOrStatus() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");

      console.log("Checking if editing by ID:", id);

      if (id) {
        // FETCH BY ID
        const res = await fetch(`/api/doctor-applications/${id}`);
        console.log("Fetch by ID status:", res.status);

        if (res.ok) {
          const data = await res.json();
          console.log("Loaded application by ID:", data);

          const safeParseArray = (field: any) => {
            if (Array.isArray(field)) return field;
            if (typeof field !== 'string' || !field.trim()) return [];
            try {
              const parsed = JSON.parse(field);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              // Handle potential Postgres array format: {item1, item2}
              if (field.startsWith('{') && field.endsWith('}')) {
                return field.replace(/[{}"]/g, "").split(",").map((s: string) => s.trim()).filter(Boolean);
              }
              return [];
            }
          };

          setDoctorForm({
            // Base the form on fetched data, providing defaults for all fields
            ...data,
            password: "", // Password should never be pre-filled for security
            country: data.country || "Burundi",
            location: safeParseArray(data.location),
            availability: safeParseArray(data.availability),
            // Normalize field names so nothing becomes undefined
            originCountry: data.originCountry || data.origin_country || "",
            image: data.image || "",
          });

          setConfirmPassword("");
          setIsEditing(true);
          setRejectionReason(data.rejection_reason);
          setApplicationStatus(data.status);
          return;
        }
      }

      // If no ID in URL, or if ID fetch failed, ensure it's a new application form
      console.log("No ID in URL, or ID not found. Creating new application form.");
      setIsEditing(false); // Ensure we are in "new application" mode
      setApplicationStatus(null); // Clear any previous status
      setRejectionReason(null); // Clear any previous rejection reason
      setDoctorForm({ // Reset form to initial state for new application
        name: "", email: "", specialty: "", location: [], bio: "", booking_type: "online", availability: [], image: "", country: "Burundi", originCountry: "", whatsapp_number: "", password: "", payment_id: "", consultation_fee_online: "", consultation_fee_offline: "", id: undefined,
      });
      setConfirmPassword("");
      setPasswordStrength(0); // Reset password strength for new application
    }

    fetchByIdOrStatus();
  }, []);

  const passwordRequirements = [
    { label: "At least 8 characters", met: (doctorForm.password || "").length >= 8 },
    { label: "1 capital letter", met: /[A-Z]/.test(doctorForm.password || "") },
    { label: "1 special character (!@#$)", met: /[!@#$%^&*(),.?":{}|<>]/.test(doctorForm.password || "") },
    { label: "At least 3 numbers", met: ((doctorForm.password || "").match(/\d/g) || []).length >= 3 },
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setDoctorForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (errors[name as keyof DoctorForm]) {
      const newErrors = { ...errors };
      delete newErrors[name as keyof DoctorForm];
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
    setDoctorForm((prev) => ({ ...prev, image: URL.createObjectURL(file) }));

    if (errors.image) {
      const newErrors = { ...errors };
      delete newErrors.image;
      setErrors(newErrors);
    }
  }

  // Locations helpers
  function handleAddLocation() {
    setDoctorForm((prev) => ({ ...prev, location: [...prev.location, ""] }));
  }

  function handleRemoveLocation(index: number) {
    setDoctorForm((prev) => ({
      ...prev,
      location: prev.location.filter((_, i) => i !== index),
    }));
  }

  function handleLocationChange(index: number, value: string) {
    const updated = [...doctorForm.location];
    updated[index] = value;
    setDoctorForm((prev) => ({ ...prev, location: updated }));
  }

  // Availability helpers
  function handleAddAvailability() {
    setDoctorForm((prev) => ({
      ...prev,
      availability: [...prev.availability, { date: "", times: [] }],
    }));
  }

  function handleRemoveAvailability(index: number) {
    setDoctorForm((prev) => ({
      ...prev,
      availability: prev.availability.filter((_, i) => i !== index),
    }));
  }

  function handleAvailabilityChange(
    index: number,
    field: "date" | "times",
    value: string
  ) {
    const updated = [...doctorForm.availability];
    if (field === "date") {
      updated[index].date = value;
    } else {
      updated[index].times = value.split(",").map((t) => t.trim());
    }
    setDoctorForm((prev) => ({ ...prev, availability: updated }));
  }

  function validateForm(): boolean {
    const newErrors: FormErrors = {};
    if (!doctorForm.name) newErrors.name = "Name is required";
    if (!doctorForm.email) newErrors.email = "Email is required";
    if (!doctorForm.specialty) newErrors.specialty = "Specialty is required";
    if (!doctorForm.whatsapp_number) newErrors.whatsapp_number = "WhatsApp number is required";
    if (!doctorForm.bio) newErrors.bio = "Bio is required";
    if (!doctorForm.payment_id) newErrors.payment_id = "Payment ID is required";
    if (!isEditing) {
      if (!doctorForm.password) {
        newErrors.password = "Password is required";
      } else {
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=(?:.*\d){3,}).{8,}$/;
        if (!passwordRegex.test(doctorForm.password)) {
          newErrors.password = "Password must be at least 8 characters, include 1 capital letter, 1 special character, and at least 3 numbers";
        }
      }
    }
    if (!isEditing && doctorForm.password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!doctorForm.image) newErrors.image = "Doctor image is required";
    if (!doctorForm.originCountry) newErrors.originCountry = "Country of origin is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // 🚀 ********* THIS IS THE NEWLY INSERTED HANDLE SUBMIT *********
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isEditing ? `/api/doctor-applications/status` : "/api/doctor-applications";
      const method = isEditing ? "PUT" : "POST";
      
      const formData = new FormData();
      
      // Append basic fields
      formData.append("name", doctorForm.name);
      formData.append("email", doctorForm.email);
      if (doctorForm.password) formData.append("password", doctorForm.password);
      formData.append("specialty", doctorForm.specialty || "");
      formData.append("bio", doctorForm.bio || "");
      formData.append("booking_type", doctorForm.booking_type || "");
      formData.append("country", doctorForm.country);
      formData.append("whatsapp_number", doctorForm.whatsapp_number);
      if (doctorForm.consultation_fee_online) formData.append("consultation_fee_online", doctorForm.consultation_fee_online);
      if (doctorForm.consultation_fee_offline) formData.append("consultation_fee_offline", doctorForm.consultation_fee_offline);
      formData.append("location", JSON.stringify(doctorForm.location.filter((loc) => loc.trim() !== "")));
      formData.append("availability", JSON.stringify(doctorForm.availability));
      formData.append("payment_id", doctorForm.payment_id || "");
      formData.append("originCountry", doctorForm.originCountry || "");
      
      if (isEditing && doctorForm.id) {
          formData.append("id", doctorForm.id);
          formData.append("status", "pending");
      }

      // Append images (File if new, URL string if existing)
      const appendImage = (key: string, file: File | undefined, currentUrl: string | undefined) => {
          if (file) formData.append(key, file);
          else if (currentUrl) formData.append(key, currentUrl);
      };

      appendImage("image", files.image, doctorForm.image);

      const res = await fetch(endpoint, {
        method,
        body: formData,
      });

      if (!res.ok) {
        // The server returned an error. Read the response body as text for more details.
        let errorMessage = `Request failed with status: ${res.status}`;
        try {
          const errorText = await res.text();
          errorMessage = errorText || errorMessage; // Use the error text if available
        } catch (textError) {
          // Could not read the response body, stick with the status code.
        }
        toast.error(errorMessage);
        return;
      }

      toast.success(
        isEditing ? "Application updated successfully! We will review it shortly." : "Application submitted successfully! Login to check your status."
      );

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  }
  // *******************************************************************

  // Small presentational helpers (kept inline to avoid extra imports)
  const FieldLabel = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  const getImageUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/doctor-images/${path}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="w-full max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-15"> {/* This div centers the h1 */}
          <h1 className="inline-block text-2xl font-extrabold tracking-tight text-slate-900 border-b-2 border-green-300 pb-2">
            {isEditing ? "Edit Your Application" : "Welcome Doctor"}
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

        <form onSubmit={handleSubmit} className="space-y-6" id="doctor-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Your Name</FieldLabel>
              <input
                type="text"
                name="name"
                placeholder="Dr. Gahungu"
                value={doctorForm.name}
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
                value={doctorForm.email}
                onChange={handleChange}
                disabled={isEditing} // Prevent email change on edit
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.email ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
            <div>
              <FieldLabel required>Specialty</FieldLabel>
              <input
                type="text"
                name="specialty"
                placeholder="e.g., Pediatrics"
                value={doctorForm.specialty}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.specialty ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>

            <div>
              <FieldLabel required>Country</FieldLabel>
              <select
                name="country"
                value={doctorForm.country}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.country ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              >
                {supportedCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel required>Country of Origin</FieldLabel>
              <input
                type="text"
                name="originCountry"
                placeholder="e.g., Burundi"
                value={doctorForm.originCountry}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.originCountry ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>Bio</FieldLabel>
            <textarea
              name="bio"
              placeholder="A brief biography of the doctor..."
              value={doctorForm.bio}
              onChange={handleChange}
              className={`w-full rounded-lg px-4 py-3 min-h-[100px] border border-transparent shadow-sm ring-1 ${errors.bio ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
            />
          </div>

          {/* Booking + Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Payment ID</FieldLabel>
              <input
                type="text"
                name="payment_id"
                placeholder="Your Payment ID"
                value={doctorForm.payment_id}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.payment_id ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>
            <div>
              <FieldLabel required>WhatsApp Number</FieldLabel>
              <input
                type="text"
                name="whatsapp_number"
                placeholder="Start by your country code like +12345678"
                value={doctorForm.whatsapp_number}
                onChange={handleChange}
                className={`w-full rounded-lg px-4 py-3 border border-transparent shadow-sm ring-1 ${errors.whatsapp_number ? 'ring-red-500' : 'ring-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 transition`}
              />
            </div>

            {!isEditing && (
              <>
                <div>
                  <FieldLabel required={!isEditing}>Password</FieldLabel>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Create a password"
                      value={doctorForm.password}
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
                  {!isEditing && doctorForm.password && (
                    <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          width: `${(passwordStrength / 4) * 100}%`, // Max score is 4
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
                  {!isEditing && doctorForm.password && (
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
                  <FieldLabel required={!isEditing}>Confirm Password</FieldLabel>
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
              </>
            )}
          </div>

          {/* Image upload */}
          <div>
            <FieldLabel required>Doctor Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Choose image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>

              {doctorForm.image && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img 
                    src={getImageUrl(doctorForm.image)} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                    onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorForm.name || 'User')}&background=random`; }}
                  />
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
              I hereby agree and accept the{" "}
              <a href="#" className="text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>
                terms and conditions
              </a>{" "}
              of Dr. Gahungu.
            </label>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                // optional cancel behaviour: reset or navigate away
                setFormError(null);
              }}
              className="px-4 py-2 rounded-md border border-slate-200 text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="doctor-form"
              disabled={isSubmitting || !agreedToTerms}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25" fill="none" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </svg>
                  Submittting...
                </>
              ) : (
                isEditing ? "Resubmit Form" : "Submit Form"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
