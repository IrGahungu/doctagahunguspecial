"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type Booking = {
  id: string;
  user_id: string;
  doctor_id: string;
  doctor_name: string;
  date: string;
  time: string;
  type: "online" | "in-office";
  status: "pending" | "confirmed" | "completed" | "cancelled";
  amount: number;
  ticket_number?: string;
  created_at: string;
  users?: {
    fullname: string;
    whatsapp_number: string;
  };
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function DoctorBookingsTable() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchBookings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings?type=doctor");
      if (!res.ok) {
        let msg = "Failed to fetch bookings";
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id: string, status: Booking["status"]) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, type: 'doctor' }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
      toast.success(`Booking status updated to ${status}`);
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const query = searchQuery.toLowerCase();
    const patientName = b.users?.fullname?.toLowerCase() || "";
    const doctorName = b.doctor_name?.toLowerCase() || "";
    const ticket = b.ticket_number?.toLowerCase() || "";
    return patientName.includes(query) || doctorName.includes(query) || ticket.includes(query);
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed": return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) return <div className="text-center p-12 text-gray-500">Loading appointments...</div>;
  if (error) return <div className="text-center p-12 text-red-500 bg-red-50 rounded-lg m-4 border border-red-100">{error}</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Doctor Appointments</h2>
          <p className="text-xs text-gray-500 mt-1">Manage scheduled consultations and statuses</p>
        </div>
        <div className="w-full max-w-sm">
          <input
            type="text"
            placeholder="Search by doctor, patient, or ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="p-4 border-b">Ref</th>
              <th className="p-4 border-b">Patient</th>
              <th className="p-4 border-b">Doctor</th>
              <th className="p-4 border-b">Schedule</th>
              <th className="p-4 border-b">Modality</th>
              <th className="p-4 border-b">Revenue</th>
              <th className="p-4 border-b">Ticket</th>
              <th className="p-4 border-b">Status</th>
              <th className="p-4 border-b text-center">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBookings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 font-mono text-[10px] text-gray-400">#{b.id.substring(0, 8)}</td>
                <td className="p-4">
                  <div className="font-semibold text-gray-900">{b.users?.fullname || "Guest"}</div>
                  <div className="text-[10px] text-gray-500">{b.users?.whatsapp_number || "No contact"}</div>
                </td>
                <td className="p-4">
                  <span className="font-medium text-fuchsia-600">Dr. {b.doctor_name}</span>
                </td>
                <td className="p-4">
                  <div className="text-gray-900">{b.date}</div>
                  <div className="text-[10px] text-gray-500 font-medium">{b.time}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${b.type === 'online' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                    {b.type}
                  </span>
                </td>
                <td className="p-4 font-bold text-gray-900">
                  {b.amount > 0 ? `BIF ${b.amount.toLocaleString()}` : <span className="text-green-600">Free</span>}
                </td>
                <td className="p-4 font-mono text-[10px] text-blue-600 font-bold">{b.ticket_number || '—'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full border capitalize inline-block min-w-[80px] text-center ${getStatusColor(b.status)}`}>
                    {b.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col items-center gap-1">
                    <select
                      value={b.status}
                      onChange={(e) => updateStatus(b.id, e.target.value as Booking["status"])}
                      disabled={updatingId === b.id}
                      className="text-[10px] font-bold py-1 px-2 border rounded-md focus:ring-1 focus:ring-fuchsia-500 outline-none disabled:bg-gray-100 cursor-pointer"
                    >
                      <option value="pending">Mark Pending</option>
                      <option value="confirmed">Confirm</option>
                      <option value="completed">Complete</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                    {updatingId === b.id && <Spinner />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBookings.length === 0 && (
          <div className="p-20 text-center text-gray-400 bg-gray-50/20">
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm">No doctor appointments found.</p>
          </div>
        )}
      </div>
    </div>
  );
}