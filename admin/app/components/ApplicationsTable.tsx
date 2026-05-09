"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

type Application = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  password?: string;
  created_at: string;
  // Common fields that might be at the top level for pharmacy/hospital/insurance applications
  name?: string;
  fullname?: string;
  email?: string;
  whatsapp_number?: string;
  location?: string; // For pharmacy/hospital/insurance
  locations?: string; // For hospital/insurance
  country?: string;
  image?: string; // For pharmacy/hospital/insurance
  specialty?: string; // For doctor
  bio?: string; // For doctor
  booking_type?: 'online' | 'offline' | 'both'; // For doctor
  availability?: string; // For doctor
  consultation_fee_online?: string; // For doctor
  consultation_fee_offline?: string; // For doctor
  id_image?: string;
  medical_degree_image?: string;
  medical_licence_image?: string;
  proof_of_practice_image?: string;
  agreement_image?: string;
  payment_id?: string;
  opening_hours?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_office?: string;
  contact_website?: string;
  views?: number;
  contact_details?: string;
  service_summary?: string;
  admission_process?: string;
  partner_insurances?: string;
  partner_pharmacies?: string;
  available_services?: string;
  available_blood_types?: string;
  medical_equipment?: string;
  insurance_plans?: string;
  coverage_summary?: string;
  claim_process?: string;
  partner_hospitals?: string;
  office_locations?: string;
  // Nested user details for doctors (if applicable)
  doctor_users?: {
    fullname?: string;
    name?: string;
    whatsapp_number: string;
    email?: string;
    password?: string;
    created_at: string;
    updated_at: string;
    specialty?: string;
    location?: string;
    bio?: string;
    booking_type?: 'online' | 'offline' | 'both';
    availability?: string;
    country?: string;
    origin_country?: string;
    payment_id?: string;
    consultation_fee_online?: string;
    consultation_fee_offline?: string;
    image?: string;
    agreement_image?: string;
    id_image?: string;
    medical_degree_image?: string;
    medical_licence_image?: string;
    proof_of_practice_image?: string;
  } | null;
  pharmacy_users?: {
    name?: string;
    email?: string;
    whatsapp_number?: string;
    password?: string;
    image?: string;
    country?: string;
    origin_country?: string;
    payment_id?: string;
    id_image?: string;
    agreement_image?: string;
    medical_licence_image?: string;
    opening_hours?: string;
    contact_email?: string;
    contact_phone?: string;
    contact_office?: string;
    contact_website?: string;
    views?: number;
  } | null;
  // Adding aliases for consistency with backend table names
  pharmacy_applications?: Application['pharmacy_users'];
  hospital_applications?: Application['hospital_users'];
  insurance_applications?: Application['insurance_users'];
  hospital_users?: {
    name?: string;
    email?: string;
    whatsapp_number?: string;
    password?: string;
    image?: string;
    country?: string;
    locations?: string;
    id_image?: string;
    agreement_image?: string;
    medical_licence_image?: string;
    proof_of_practice_image?: string;
    payment_id?: string;
    contact_details?: string;
    service_summary?: string;
    admission_process?: string;
    partner_insurances?: string;
    partner_pharmacies?: string;
    available_services?: string;
    available_blood_types?: string;
    medical_equipment?: string;
    views?: number;
  } | null;
  insurance_users?: {
    name?: string;
    email?: string;
    whatsapp_number?: string;
    password?: string;
    image?: string;
    country?: string;
    location?: string;
    locations?: string; // Adding plural as used in updates
    id_image?: string;
    agreement_image?: string;
    medical_licence_image?: string;
    proof_of_practice_image?: string;
    payment_id?: string;
    contact_details?: string;
    service_summary?: string;
    admission_process?: string;
    partner_insurances?: string;
    partner_pharmacies?: string;
    available_services?: string;
    available_blood_types?: string;
    medical_equipment?: string;
    views?: number;
    insurance_plans?: string;
    coverage_summary?: string;
    claim_process?: string;
    partner_hospitals?: string;
    office_locations?: string;
  } | null;
  origin_country?: string;
};

const getImageUrl = (path: string | undefined, bucket?: string) => {
  if (!path) return undefined;
  if (path.startsWith("http") || path.startsWith("https")) return path;
  // Construct Supabase storage URL for relative paths
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!supabaseUrl) console.warn("[getImageUrl] NEXT_PUBLIC_SUPABASE_URL is missing");

  // Remove trailing slash from supabaseUrl if present
  const baseUrl = supabaseUrl.replace(/\/$/, "");
  // Remove leading slash from path if present
  const cleanPath = path.replace(/^\//, "");
  
  let finalPath = cleanPath;
  if (bucket && !cleanPath.startsWith(bucket)) {
    finalPath = `${bucket}/${cleanPath}`;
  }

  const fullUrl = `${baseUrl}/storage/v1/object/public/${finalPath}`;
  console.log(`[getImageUrl] Input: "${path}", Generated: "${fullUrl}"`);
  return fullUrl;
};

const ImageViewer: React.FC<{ src: string | undefined; alt: string; bucket?: string }> = ({ src, alt, bucket }) => {
  const [hasError, setHasError] = useState(false);
  const fullSrc = getImageUrl(src, bucket);

  useEffect(() => {
    setHasError(false);
  }, [fullSrc]);

  if (!fullSrc || hasError) {
    return (
      <div className="w-12 h-12 bg-gray-100 rounded-md border flex items-center justify-center text-gray-400" title="No Image">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      </div>
    );
  }
  return <a href={fullSrc} target="_blank" rel="noopener noreferrer" className="block w-12 h-12">
    <img src={fullSrc} alt={alt} className="w-full h-full object-cover rounded-md border" onError={(e) => {
      console.error(`[ImageViewer] Failed to load image: ${fullSrc}`);
      setHasError(true);
    }} />
  </a>;
};

export default function ApplicationsTable({ type }: { type: "doctor" | "pharmacy" | "hospital" | "insurance" }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const togglePasswordVisibility = (appId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [applicationToApprove, setApplicationToApprove] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [applicationToReject, setApplicationToReject] = useState<string | null>(null);
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; title: string; content: any; extra?: string } | null>(null);
  const [docsModal, setDocsModal] = useState<{ 
    isOpen: boolean; 
    doctor: Application['doctor_users'] | Application // Allow either doctor_users or the main application object
  } | null>(null);

  async function fetchApplications() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/applications?type=${type}`);
      console.log("Fetch applications response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to fetch applications: ${res.status} - ${JSON.stringify(errorData)}`);
      }
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  const updateApplicationStatus = async (
    id: string,
    status: "approved" | "rejected",
    reason?: string
  ) => {
    setUpdatingId(id);
    try {
      setError(null); // Clear previous errors
      const bodyPayload: any = { id, status, type };
      if (status === 'rejected' && reason) {
        bodyPayload.rejection_reason = reason;
      }
      const res = await fetch(`/api/admin/applications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to update status: ${res.status} - ${JSON.stringify(errorData)}`);
      }

      setApplications(prev =>
        prev.map(app => (app.id === id ? { ...app, status } : app))
      );
      toast.success(`Application ${status} successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `An unknown error occurred while updating the application.`);
      // Optional: Re-fetch to sync with server state in case of error
      fetchApplications();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    setApplicationToApprove(id);
    setIsApproveModalOpen(true);
  };

  const handleReject = async (id: string) => {
    setApplicationToReject(id);
    setIsRejectModalOpen(true);
  };

  const submitApproval = async () => {
    if (!applicationToApprove) return;
    await updateApplicationStatus(applicationToApprove, 'approved');
    setIsApproveModalOpen(false);
  };

  const submitRejection = async () => {
    if (!applicationToReject) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    await updateApplicationStatus(applicationToReject, 'rejected', rejectionReason);
    // Close modal and reset state
    setIsRejectModalOpen(false);
    setRejectionReason("");
    setApplicationToReject(null);
  };

  const filteredApplications = applications.filter((app) => {
    const name = (
      app.name || 
      app.doctor_users?.name || app.doctor_users?.fullname || 
      app.pharmacy_users?.name || 
      app.hospital_users?.name || 
      app.insurance_users?.name || "").toLowerCase();
    const specialty = (app.specialty || app.doctor_users?.specialty || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || specialty.includes(query);
  });

  const isPharma = type === "pharmacy";
  const isHospital = type === "hospital";
  const isInsurance = type === "insurance";

  const renderFormattedModalContent = () => {
    if (!viewModal || !viewModal.content) return null;
    const { content, title, extra } = viewModal;

    // Handle generic key-value object for details
    if (typeof content === 'object' && !Array.isArray(content)) {
      const entries = Object.entries(content).filter(([_, value]) => value !== undefined && value !== null && value !== "");
      
      if (entries.length === 0) {
        return <p className="text-gray-400 italic text-sm">No detailed information provided for this application.</p>;
      }

      return (
        <div className="space-y-4">
          {entries.map(([key, value]) => {
            let parsedValue = value;
            // Auto-parse JSON strings for better rendering
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
              try {
                parsedValue = JSON.parse(value);
              } catch (e) {}
            }

            const renderValue = (val: any) => {
              // Specialized rendering for Opening Hours
              if (key === "Opening Hours" && Array.isArray(val)) {
                return (
                  <div className="space-y-1 mt-1">
                    {val.map((h: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs bg-white p-2 rounded border border-gray-100 shadow-sm">
                        <span className="font-semibold text-gray-600">{h.day || 'Unspecified Day'}</span>
                        <span className={h.isClosed ? "text-red-500 font-medium" : "text-green-600 font-medium"}>
                          {h.isClosed ? "Closed" : h.is24Hours ? "24 Hours" : `${h.open || '??:??'} - ${h.close || '??:??'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }

              // Render arrays as bulleted lists
              if (Array.isArray(val)) {
                return (
                  <ul className="space-y-2 mt-1">
                    {val.map((item: any, i: number) => (
                      <li key={i} className="text-sm text-gray-700">
                        {typeof item === 'object' && item !== null ? (
                          <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                            {Object.entries(item).map(([k, v]) => (
                              <div key={k} className="flex gap-2 mb-1 last:mb-0">
                                <span className="font-bold text-gray-400 uppercase text-[9px] min-w-[80px]">{k.replace(/_/g, ' ')}:</span>
                                <span className="text-gray-800 flex-1">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <span className="text-indigo-500">•</span>
                            <span>{String(item)}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                );
              }

            // Render nested objects (like structured contact details)
            if (typeof val === 'object' && val !== null) {
              return (
                <div className="space-y-1 mt-1">
                  {Object.entries(val).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-xs bg-white p-2 rounded border border-gray-100 shadow-sm">
                      <span className="font-bold text-gray-400 uppercase tracking-widest min-w-[100px] text-[9px]">
                        {k.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-800 flex-1 font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              );
            }

              // Default string/number rendering
              return <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{String(val)}</p>;
            };

            return (
              <div key={key} className="border-b pb-3 last:border-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{key}</p>
                {renderValue(parsedValue)}
              </div>
            );
          })}
        </div>
      );
    }

    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;

      // Handle Availability Array
      if (Array.isArray(parsed) && parsed.length > 0 && 'date' in parsed[0]) {
        return (
          <div className="space-y-4">
            {parsed.map((item: any, i: number) => (
              <div key={i} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm">
                <p className="font-bold text-indigo-700 flex items-center gap-2">
                  <span className="text-lg">📅</span> {item.date}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.times?.map((t: string, ti: number) => (
                    <span key={ti} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-mono border border-indigo-100">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }

      // Handle Structured Locations
      if (Array.isArray(parsed) && parsed.length > 0 && ('address' in parsed[0] || 'city' in parsed[0])) {
        return (
          <div className="space-y-3">
            {parsed.map((loc: any, i: number) => (
              <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">{loc.type || 'Location'}</span>
                  {loc.phone && <span className="text-xs text-blue-600">📞 {loc.phone}</span>}
                </div>
                <p className="font-bold text-gray-800">{loc.city}</p>
                <p className="text-sm text-gray-600">{loc.address}</p>
              {loc.latitude && loc.longitude && (
                <div className="mt-3 space-y-2">
                  <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                    {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${loc.latitude},${loc.longitude}`}
                      >
                      </iframe>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gray-50 text-gray-500 text-xs italic">
                        <p>Google Maps API Key is missing or invalid.</p>
                        <p className="mt-1">Check your .env.local file.</p>
                      </div>
                    )}
                  </div>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Open in Google Maps
                  </a>
                </div>
              )}
              </div>
            ))}
            {extra && <p className="mt-4 text-xs font-bold text-gray-400 uppercase text-center border-t pt-2">Region: {extra}</p>}
          </div>
        );
      }
    } catch (e) { /* Fallback to standard string rendering */ }

    return <p className="whitespace-pre-wrap text-sm text-gray-800">{content}{extra ? `, ${extra}` : ''}</p>;
  };

  if (loading) return <div className="text-center p-8">Loading applications...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold">Manage Applications</h2>
        <div className="w-full max-w-sm">
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border whitespace-nowrap">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">{type === "doctor" ? "Doctor Name" : type === "pharmacy" ? "Pharmacy Name" : type === "hospital" ? "Hospital Name" : type === "insurance" ? "Insurance Name" : "Name"}</th>
              <th className="p-2">Email</th>
              <th className="p-2">WhatsApp</th>
              <th className="p-2">Password</th>
              {!isPharma && !isHospital && !isInsurance && <th className="p-2">Specialty</th>}
              <th className="p-2">Country</th>
              <th className="p-2">Location</th>
              {(isPharma || isHospital || isInsurance) && <th className="p-2">Payment ID</th>}
              {(isPharma || isHospital || isInsurance) && <th className="p-2">Views</th>}
              {(isPharma || isHospital || isInsurance) && <th className="p-2">Details</th>}
              {!isPharma && !isHospital && !isInsurance && <th className="p-2">Availability</th>}
              <th className="p-2">Verification Docs</th>
              <th className="p-2">Submitted On</th>
              <th className="p-2">{isPharma ? "Logo" : "Image"}</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="p-2">
                  {app.name || app.doctor_users?.name || app.doctor_users?.fullname || 
                   app.pharmacy_users?.name || app.hospital_users?.name || app.insurance_users?.name || "—"}
                </td>
                <td className="p-2">
                  {app.email || app.doctor_users?.email || 
                   app.pharmacy_users?.email || app.hospital_users?.email || app.insurance_users?.email || "—"}
                </td>
                <td className="p-2">
                  {app.whatsapp_number || app.doctor_users?.whatsapp_number || 
                   app.pharmacy_users?.whatsapp_number || app.hospital_users?.whatsapp_number || app.insurance_users?.whatsapp_number || "—"}
                </td>
                <td className="p-2">
                  <div className="flex items-center justify-between gap-2 min-w-[100px]">
                    <span className="font-mono">
                      {visiblePasswords.has(app.id) 
                        ? (app.password || app.doctor_users?.password || app.pharmacy_users?.password || app.hospital_users?.password || app.insurance_users?.password || "—") 
                        : "********"}
                    </span>
                    <button 
                      onClick={() => togglePasswordVisibility(app.id)}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-1 focus:outline-none"
                      title={visiblePasswords.has(app.id) ? "Hide password" : "Show password"}
                    >
                      {visiblePasswords.has(app.id) ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
                {!isPharma && !isHospital && !isInsurance && <td className="p-2">{app.specialty || app.doctor_users?.specialty || "—"}</td>}
                <td className="p-2">
                  {app.country || app.doctor_users?.country || app.pharmacy_users?.country || app.hospital_users?.country || app.insurance_users?.country || app.origin_country || "—"}
                </td>
                <td className="p-2">
                  {(app.location || app.locations || app.doctor_users?.location || app.hospital_users?.locations || app.insurance_users?.location || app.insurance_users?.locations) && (
                    <button
                      onClick={() => setViewModal({
                        isOpen: true,
                        title: "Location Details",
                        content: app.location || app.locations || app.doctor_users?.location || app.hospital_users?.locations || app.insurance_users?.location || app.insurance_users?.locations || "",
                        extra: app.country || app.doctor_users?.country || app.pharmacy_users?.country || app.hospital_users?.country || app.insurance_users?.country || app.origin_country
                      })}
                      className="px-3 py-1 bg-blue-100 text-blue-600 text-xs rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                  )}
                </td>
                {(isPharma || isHospital || isInsurance) && <td className="p-2">{app.payment_id || app.pharmacy_users?.payment_id || app.hospital_users?.payment_id || app.insurance_users?.payment_id || "—"}</td>}
                {(isPharma || isHospital || isInsurance) && <td className="p-2">{app.views || app.pharmacy_users?.views || app.hospital_users?.views || app.insurance_users?.views || 0}</td>}
                {isPharma && (
                  <td className="p-2">
                    <button
                      onClick={() => {
                        const pData = app.pharmacy_users || app.pharmacy_applications;
                        setViewModal({
                          isOpen: true,
                          title: "Pharmacy Full Information",
                          content: {
                            "Opening Hours": app.opening_hours || pData?.opening_hours,
                            "Contact Email": app.contact_email || pData?.contact_email,
                            "Contact Phone": app.contact_phone || pData?.contact_phone,
                            "Contact Office": app.contact_office || pData?.contact_office,
                            "Contact Website": app.contact_website || pData?.contact_website,
                          }
                        });
                      }}
                      className="px-3 py-1 bg-purple-100 text-purple-600 text-xs rounded hover:bg-purple-200"
                    >
                      View Details
                    </button>
                  </td>
                )}
                {isHospital && (
                  <td className="p-2">
                    <button
                      onClick={() => {
                        const hData = app.hospital_users || app.hospital_applications;
                        setViewModal({
                          isOpen: true,
                          title: "Hospital Full Information",
                          content: {
                            "Contact Details": hData?.contact_details || app.contact_details,
                            "Service Summary": hData?.service_summary || app.service_summary,
                            "Admission Process": hData?.admission_process || app.admission_process,
                            "Partner Insurances": hData?.partner_insurances || app.partner_insurances,
                            "Partner Pharmacies": hData?.partner_pharmacies || app.partner_pharmacies,
                            "Available Services": hData?.available_services || app.available_services,
                            "Available Blood Types": hData?.available_blood_types || app.available_blood_types,
                            "Medical Equipment": hData?.medical_equipment || app.medical_equipment,
                          }
                        });
                      }}
                      className="px-3 py-1 bg-green-100 text-green-600 text-xs rounded hover:bg-green-200"
                    >
                      View Details
                    </button>
                  </td>
                )}
                {isInsurance && (
                  <td className="p-2">
                    <button
                      onClick={() => {
                        const iData = app.insurance_users || app.insurance_applications;
                        setViewModal({
                          isOpen: true,
                          title: "Insurance Full Information",
                          content: {
                            "Insurance Plans": app.insurance_plans || iData?.insurance_plans,
                            "Coverage Summary": app.coverage_summary || iData?.coverage_summary,
                            "Claim Process": app.claim_process || iData?.claim_process,
                            "Partner Hospitals": app.partner_hospitals || iData?.partner_hospitals,
                            "Partner Pharmacies": app.partner_pharmacies || iData?.partner_pharmacies,
                            "Office Locations": app.office_locations || app.locations || iData?.office_locations || iData?.locations,
                            "Contact Details": app.contact_details || iData?.contact_details,
                            "Location": app.location || iData?.location,
                          }
                        });
                      }}
                      className="px-3 py-1 bg-teal-100 text-teal-600 text-xs rounded hover:bg-teal-200"
                    >
                      View Details
                    </button>
                  </td>
                )}
                {!isPharma && !isHospital && !isInsurance && <td className="p-2">
                  {(app.availability || app.doctor_users?.availability) && (
                    <button
                      onClick={() => setViewModal({ isOpen: true, title: "Availability Details", content: app.doctor_users?.availability || "" })}
                      className="px-3 py-1 bg-blue-100 text-blue-600 text-xs rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                  )}
                </td>}
                <td className="p-2">
                  <button 
                    onClick={() => setDocsModal({ isOpen: true, doctor: app.doctor_users || app.pharmacy_users || app.hospital_users || app.insurance_users || app as any })}
                    className="px-3 py-1 bg-indigo-100 text-indigo-600 text-xs rounded hover:bg-indigo-200 font-semibold"
                  >
                    View Credentials
                  </button>
                </td>
                <td className="p-2">{new Date(app.created_at).toLocaleDateString()}</td>
                <td className="p-2">
                  <ImageViewer 
                    src={app.image || app.doctor_users?.image || app.pharmacy_users?.image || app.hospital_users?.image || app.insurance_users?.image} 
                    alt="Application Image" 
                    bucket={type === 'doctor' ? 'doctor-images' : type === 'pharmacy' ? 'pharmacy-images' : type === 'hospital' ? 'hospital-images' : 'insurance-images'} 
                  />
                </td>
                <td className="p-2 text-center">
                  <div className="flex flex-col gap-1 items-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full capitalize mb-1 ${
                        app.status === 'approved'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : app.status === 'rejected'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}
                    >
                      {app.status}
                    </span>
                    
                    {app.status === 'rejected' && app.rejection_reason && (
                      <button 
                        onClick={() => setViewModal({ isOpen: true, title: "Rejection Reason", content: app.rejection_reason || "" })}
                        className="text-[10px] text-red-600 underline hover:text-red-800 mb-1"
                      >
                        Show Reason
                      </button>
                    )}

                    <div className="flex flex-col gap-1 w-full max-w-[100px]">
                      {app.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={updatingId === app.id}
                          className="btn-approve w-full"
                        >
                          <div className="flex justify-center">{updatingId === app.id ? <Spinner /> : 'Approve'}</div>
                        </button>
                      )}
                      {app.status !== 'rejected' && (
                      <button
                        onClick={() => handleReject(app.id)}
                        disabled={updatingId === app.id}
                          className="btn-reject w-full"
                        >
                          <div className="flex justify-center">{updatingId === app.id ? <Spinner /> : 'Reject'}</div>
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {filteredApplications.length === 0 && (
              <tr>
                <td colSpan={12} className="p-4 text-center text-gray-500">No applications found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isApproveModalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-2xl border w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">Confirm Approval</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to approve this doctor's application? They will gain access to the platform immediately.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsApproveModalOpen(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={submitApproval} className="btn-approve" disabled={updatingId === applicationToApprove}>
                {updatingId === applicationToApprove ? 'Processing...' : 'Yes, Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-2xl border w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Reason for Rejection</h3>
                <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2 border rounded-md min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Explain why the application is being rejected..."
                />
                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={() => setIsRejectModalOpen(false)} className="btn-cancel">
                        Cancel
                    </button>
                    <button onClick={submitRejection} className="btn-reject" disabled={updatingId === applicationToReject}>
                        {updatingId === applicationToReject ? 'Submitting...' : 'Submit Rejection'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {docsModal?.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDocsModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-lg text-gray-800">{type === "doctor" ? "Doctor Credentials" : type === "pharmacy" ? "Pharmacy Credentials" : type === "hospital" ? "Hospital Credentials" : "Insurance Credentials"}: {(docsModal.doctor as any)?.name || (docsModal.doctor as any)?.fullname || "N/A"}</h3>
              <button onClick={() => setDocsModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <div className="p-4 border-b bg-indigo-50/50 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Booking Type</span>
                <span className="text-sm font-semibold capitalize text-indigo-700">{docsModal.doctor?.booking_type || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Online Consultation Fee</span>
                <span className="text-sm font-semibold text-green-700">{docsModal.doctor?.consultation_fee_online ? `BIF ${Number(docsModal.doctor.consultation_fee_online).toLocaleString()}` : '—'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">In-Office Consultation Fee</span>
                <span className="text-sm font-semibold text-green-700">{docsModal.doctor?.consultation_fee_offline ? `BIF ${Number(docsModal.doctor.consultation_fee_offline).toLocaleString()}` : '—'}</span>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: "ID Image", src: docsModal.doctor?.id_image },
                { label: "Medical Degree", src: docsModal.doctor?.medical_degree_image },
                { label: "Medical License", src: docsModal.doctor?.medical_licence_image },
                { label: "Proof of Practice", src: docsModal.doctor?.proof_of_practice_image },
                { label: "Agreement Image", src: docsModal.doctor?.agreement_image },
              ].map((doc, idx) => {
                const currentBucket = type === 'doctor' ? 'doctor-images' : type === 'pharmacy' ? 'pharmacy-images' : type === 'hospital' ? 'hospital-images' : 'insurance-images';
                return (
                <div key={idx} className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{doc.label}</span>
                  {doc.src ? (
                    <div className="relative group aspect-[4/3] bg-gray-100 rounded-lg border overflow-hidden">
                      <img src={getImageUrl(doc.src, currentBucket)} className="w-full h-full object-cover" />
                      <a 
                        href={getImageUrl(doc.src, currentBucket)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                      >
                        View Full Size
                      </a>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gray-50 rounded-lg border border-dashed flex items-center justify-center text-gray-400 text-xs italic">Not Provided</div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewModal?.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setViewModal(null)}>
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{viewModal.title}</h3>
            <div className="bg-gray-50 p-4 rounded border max-h-[60vh] overflow-y-auto">
              {renderFormattedModalContent()}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setViewModal(null)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}