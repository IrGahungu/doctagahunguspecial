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
  agreementImage?: string;
  country: string;
  originCountry?: string; // New field
  idImage?: string; // New field
  medicalDegreeImage?: string; // New field
  medicalLicenceImage?: string; // New field
  proofOfPracticeImage?: string; // New field
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
    agreementImage: "",
    country: "Burundi",
    originCountry: "",
    idImage: "",
    medicalDegreeImage: "",
    medicalLicenceImage: "",
    proofOfPracticeImage: "",
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
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAgreement, setIsUploadingAgreement] = useState(false);
  const [isUploadingIdImage, setIsUploadingIdImage] = useState(false);
  const [isUploadingMedicalDegree, setIsUploadingMedicalDegree] = useState(false);
  const [isUploadingMedicalLicence, setIsUploadingMedicalLicence] = useState(false);
  const [isUploadingProofOfPractice, setIsUploadingProofOfPractice] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

          setDoctorForm({
            // Base the form on fetched data, providing defaults for all fields
            ...data,
            password: "",
            confirmPassword: "",
            country: data.country || "Burundi", // Explicitly set country to prevent it from being cleared
            location: data.location || [],

            // Normalize field names so nothing becomes undefined
            originCountry: data.originCountry || data.origin_country || "",
            image: data.image || "",
            agreementImage: data.agreementImage || data.agreement_image || "",

            idImage: data.idImage || data.id_image || "",
            medicalDegreeImage: data.medicalDegreeImage || data.medical_degree_image || "",
            medicalLicenceImage: data.medicalLicenceImage || data.medical_licence_image || "",
            proofOfPracticeImage: data.proofOfPracticeImage || data.proof_of_practice_image || "",
          });


          setIsEditing(true);
          setRejectionReason(data.rejection_reason);
          setApplicationStatus(data.status);
          return;
        } else {
          console.log("Application not found for id:", id);
        }
      }

      // OTHERWISE FETCH STATUS API
      const res = await fetch("/api/doctor-applications/status");
      console.log("Fetch status API:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("Loaded existing application:", data);

        setDoctorForm({
          ...data,
          // Ensure all optional fields have a default value to prevent controlled/uncontrolled input errors.
          password: "",
          country: data.country || "Burundi",
          location: data.location || [],
          originCountry: data.originCountry || data.origin_country || "",
          image: data.image || "",
          agreementImage: data.agreementImage || data.agreement_image || "",
          idImage: data.idImage || data.id_image || "",
          medicalDegreeImage: data.medicalDegreeImage || data.medical_degree_image || "",
          medicalLicenceImage: data.medicalLicenceImage || data.medical_licence_image || "",
          proofOfPracticeImage: data.proofOfPracticeImage || data.proof_of_practice_image || "",
        });

        setIsEditing(true);
        setApplicationStatus(data.status);
        return;
      }

      console.log("No existing application, creating new...");
      setIsEditing(false);
    }

    fetchByIdOrStatus();
  }, []);


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
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "doctor-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setDoctorForm((prev) => ({ ...prev, image: result.publicUrl }));
      if (errors.image) {
        const newErrors = { ...errors };
        delete newErrors.image;
        setErrors(newErrors);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed unexpectedly");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleIdImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIdImage(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "id-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setDoctorForm((prev) => ({ ...prev, idImage: result.publicUrl }));
      if (errors.idImage) {
        const newErrors = { ...errors };
        delete newErrors.idImage;
        setErrors(newErrors);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed unexpectedly");
    } finally {
      setIsUploadingIdImage(false);
    }
  }

  async function handleMedicalDegreeImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedicalDegree(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "degree-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setDoctorForm((prev) => ({ ...prev, medicalDegreeImage: result.publicUrl }));
      if (errors.medicalDegreeImage) {
        const newErrors = { ...errors };
        delete newErrors.medicalDegreeImage;
        setErrors(newErrors);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed unexpectedly");
    } finally {
      setIsUploadingMedicalDegree(false);
    }
  }

  async function handleMedicalLicenceImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedicalLicence(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "licence-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setDoctorForm((prev) => ({ ...prev, medicalLicenceImage: result.publicUrl }));
      if (errors.medicalLicenceImage) {
        const newErrors = { ...errors };
        delete newErrors.medicalLicenceImage;
        setErrors(newErrors);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed unexpectedly");
    } finally {
      setIsUploadingMedicalLicence(false);
    }
  }

  async function handleProofOfPracticeImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProofOfPractice(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "proof-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setDoctorForm((prev) => ({ ...prev, proofOfPracticeImage: result.publicUrl }));
      if (errors.proofOfPracticeImage) {
        const newErrors = { ...errors };
        delete newErrors.proofOfPracticeImage;
        setErrors(newErrors);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed unexpectedly");
    } finally {
      setIsUploadingProofOfPractice(false);
    }
  }

  async function handleAgreementImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("Agreement image upload started for file:", file.name);

    setIsUploadingAgreement(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "agreement-images"); // Use a different bucket

    try {
      console.log("Sending request to /api/upload for agreement image...");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      console.log("Received response from /api/upload:", { status: res.status, ok: res.ok, body: result });

      if (!res.ok) throw new Error(result.error || "Upload failed");

      console.log("Setting agreement image URL:", result.publicUrl);
      setDoctorForm((prev) => ({ ...prev, agreementImage: result.publicUrl }));
      if (errors.agreementImage) {
        const newErrors = { ...errors };
        delete newErrors.agreementImage;
        setErrors(newErrors);
      }
    } catch (err) {
      console.error("Error during agreement image upload:", err);
      setFormError(err instanceof Error ? err.message : "Upload failed unexpectedly");
    } finally {
      setIsUploadingAgreement(false);
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
    if (!isEditing && !doctorForm.password) newErrors.password = "Password is required";
    if (!isEditing && doctorForm.password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!doctorForm.image) newErrors.image = "Doctor image is required";
    if (!doctorForm.agreementImage) newErrors.agreementImage = "Agreement image is required";
    if (!doctorForm.originCountry) newErrors.originCountry = "Country of origin is required";
    if (!doctorForm.idImage) newErrors.idImage = "ID image is required";
    if (!doctorForm.medicalDegreeImage) newErrors.medicalDegreeImage = "Medical Degree image is required";
    if (!doctorForm.medicalLicenceImage) newErrors.medicalLicenceImage = "Medical Licence image is required";
    if (!doctorForm.proofOfPracticeImage) newErrors.proofOfPracticeImage = "Proof of Practice image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // 🚀 ********* THIS IS THE NEWLY INSERTED HANDLE SUBMIT *********
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      setFormError("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isEditing ? `/api/doctor-applications/status` : "/api/doctor-applications";
      const method = isEditing ? "PUT" : "POST";
      const payload = {
        ...doctorForm,
        id: isEditing ? doctorForm.id : undefined,
        status: isEditing ? "pending" : undefined, // Reset status to pending on resubmission
      };

      payload.location = payload.location.filter((loc) => loc.trim() !== "");

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        throw new Error(errorMessage);
      }

      toast.success(
        isEditing ? "Application updated successfully! We will review it shortly." : "Application submitted successfully! Login to check your status."
      );

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unexpected error"
      );
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
                placeholder="+1234567890"
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
                <span>{isUploading ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>

              {doctorForm.image && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={doctorForm.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Id upload */}
          <div>
            <FieldLabel required>Id Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isUploadingIdImage ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleIdImageUpload} className="hidden" />
              </label>

              {doctorForm.idImage && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={doctorForm.idImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* MedicalDegree upload */}
          <div>
            <FieldLabel required>Medical Degree Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isUploadingMedicalDegree ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleMedicalDegreeImageUpload} className="hidden" />
              </label>

              {doctorForm.medicalDegreeImage && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={doctorForm.medicalDegreeImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Licence upload */}
          <div>
            <FieldLabel required>Medical Licence Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isUploadingMedicalLicence ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleMedicalLicenceImageUpload} className="hidden" />
              </label>

              {doctorForm.medicalLicenceImage && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={doctorForm.medicalLicenceImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Proof upload */}
          <div>
            <FieldLabel required>Proof Of Practice Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.image ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isUploadingProofOfPractice ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleProofOfPracticeImageUpload} className="hidden" />
              </label>

              {doctorForm.proofOfPracticeImage && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={doctorForm.proofOfPracticeImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Agreement Image upload */}
          <div>
            <FieldLabel required>Agreement Image</FieldLabel>
            <div className="flex items-center gap-4">
              <label className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50 border cursor-pointer text-sm shadow-sm ring-1 ${errors.agreementImage ? 'ring-red-500' : 'ring-transparent'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isUploadingAgreement ? "Uploading..." : "Choose image"}</span>
                <input type="file" accept="image/*" onChange={handleAgreementImageUpload} className="hidden" />
              </label>

              {doctorForm.agreementImage && (
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-100 shadow-sm">
                  <img src={doctorForm.agreementImage} alt="Preview" className="w-full h-full object-cover" />
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
              className="px-4 py-2 rounded-md border border-slate-200 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="doctor-form"
              disabled={isSubmitting || isUploading || isUploadingAgreement || isUploadingIdImage || isUploadingMedicalDegree || isUploadingMedicalLicence || isUploadingProofOfPractice || !agreedToTerms}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
