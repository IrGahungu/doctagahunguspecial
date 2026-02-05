"use client";

import { useEffect, useState } from "react";

type Application = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  doctor_users: {
    name: string;
    whatsapp_number: string;
    email?: string; // Assuming email is available in profiles
    created_at: string;
    updated_at: string;
    specialty?: string;
    location?: string;
    bio?: string;
    booking_type?: 'online' | 'offline' | 'both';
    availability?: string; // Could be a JSON string or a more structured type
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

export default function ApplicationsTable() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [applicationToReject, setApplicationToReject] = useState<string | null>(null);
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; title: string; content: string } | null>(null);

  async function fetchApplications() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications");
      console.log("Fetch applications response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to fetch applications: ${res.status} - ${JSON.stringify(errorData)}`);
      }
      const data = await res.json()
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
      const bodyPayload: { id: string; status: string; rejection_reason?: string } = { id, status };
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
    } catch (err) {
      setError(err instanceof Error ? err.message : `An unknown error occurred while updating the application.`);
      // Optional: Re-fetch to sync with server state in case of error
      fetchApplications();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    if (confirm("Are you sure you want to approve this application?")) {
      await updateApplicationStatus(id, 'approved');
    }
  };

  const handleReject = async (id: string) => {
    setApplicationToReject(id);
    setIsRejectModalOpen(true);
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

  if (loading) return <div className="text-center p-8">Loading applications...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Applications</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border whitespace-nowrap">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Doctor Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">WhatsApp</th>
              <th className="p-2">Specialty</th>
              <th className="p-2">Location</th>
              <th className="p-2">Availability</th>
              <th className="p-2">Status</th>
              <th className="p-2">Date of Submission</th>
              <th className="p-2">Doctor Image</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="p-2">{app.doctor_users?.name || "N/A"}</td>
                <td className="p-2">{app.doctor_users?.email || "N/A"}</td>
                <td className="p-2">{app.doctor_users?.whatsapp_number || "N/A"}</td>
                <td className="p-2">{app.doctor_users?.specialty || "N/A"}</td>
                <td className="p-2">
                  {app.doctor_users?.location ? (
                    <button
                      onClick={() => setViewModal({
                        isOpen: true,
                        title: "Location Details",
                        content: `${app.doctor_users?.location}, ${app.doctor_users?.country || ''}`
                      })}
                      className="px-3 py-1 bg-blue-100 text-blue-600 text-xs rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                  ) : "N/A"}
                </td>
                <td className="p-2">
                  {app.doctor_users?.availability ? (
                    <button
                      onClick={() => setViewModal({ isOpen: true, title: "Availability Details", content: app.doctor_users?.availability || "" })}
                      className="px-3 py-1 bg-blue-100 text-blue-600 text-xs rounded hover:bg-blue-200"
                    >
                      View
                    </button>
                  ) : "N/A"}
                </td>
                <td className="p-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                      app.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : app.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >{app.status || "N/A"}</span>
                </td>
                <td className="p-2">{new Date(app.created_at).toLocaleDateString()}</td>
                <td className="p-2">
                  <ImageViewer src={app.doctor_users?.image} alt="Doctor Image" bucket="doctor-images" />
                </td>
                <td className="p-2 space-y-2 text-center">
                  {app.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={updatingId === app.id}
                        className="w-full px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >{updatingId === app.id ? 'Updating...' : 'Approve'}</button>
                      <button
                        onClick={() => handleReject(app.id)}
                        disabled={updatingId === app.id}
                        className="w-full px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >{updatingId === app.id ? 'Updating...' : 'Reject'}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">No pending applications found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Reason for Rejection</h3>
                <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2 border rounded-md min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Explain why the application is being rejected..."
                />
                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50">
                        Cancel
                    </button>
                    <button onClick={submitRejection} className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:bg-gray-400" disabled={updatingId === applicationToReject}>
                        {updatingId === applicationToReject ? 'Submitting...' : 'Submit Rejection'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {viewModal?.isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setViewModal(null)}>
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{viewModal.title}</h3>
            <div className="bg-gray-50 p-4 rounded border max-h-[60vh] overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm text-gray-800">{viewModal.content}</p>
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