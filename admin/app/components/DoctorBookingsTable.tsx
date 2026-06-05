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
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<Booking['status']>("confirmed");
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; type: 'delete' | 'update' } | null>(null);

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

  const toggleSelectAll = () => {
    if (selectedBookingIds.size === filteredBookings.length) {
      setSelectedBookingIds(new Set());
    } else {
      setSelectedBookingIds(new Set(filteredBookings.map(booking => booking.id)));
    }
  };

  const toggleSelect = (bookingId: string) => {
    const next = new Set(selectedBookingIds);
    if (next.has(bookingId)) {
      next.delete(bookingId);
    } else {
      next.add(bookingId);
    }
    setSelectedBookingIds(next);
  };

  function handleBulkStatusUpdate() {
    if (selectedBookingIds.size === 0) return;
    setIsBulkStatusModalOpen(false); // Close the status selection modal
    // Using the existing confirmModal state pattern
    // Assuming a confirmModal state is defined in this component, if not, it needs to be added.
    // For now, I'll add it to the component's state.
    setConfirmModal({
      title: "Confirm Bulk Status Update",
      message: `Are you sure you want to update the status of ${selectedBookingIds.size} bookings to "${bulkUpdateStatus}"?`,
      onConfirm: executeBulkUpdate,
      type: 'update' // Add type for styling if needed
    });
  }

  async function executeBulkUpdate() {
    setUpdatingId('bulk'); // Indicate a bulk update is in progress
    setConfirmModal(null); // Close confirmation modal
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedBookingIds),
          status: bulkUpdateStatus,
          type: 'doctor'
        }),
      });

      if (!res.ok) throw new Error("Failed to bulk update booking statuses");

      setBookings(prev =>
        prev.map(booking =>
          selectedBookingIds.has(booking.id) ? { ...booking, status: bulkUpdateStatus } : booking
        )
      );
      setSelectedBookingIds(new Set());
      toast.success(`Successfully updated status for ${selectedBookingIds.size} bookings.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unknown error occurred during bulk update.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredBookings = bookings.filter((b) => {
    const query = searchQuery.toLowerCase();
    const patientName = b.users?.fullname?.toLowerCase() || "";
    const doctorName = b.doctor_name?.toLowerCase() || "";
    const ticket = b.ticket_number?.toLowerCase() || "";
    const matchesSearch = patientName.includes(query) || doctorName.includes(query) || ticket.includes(query);
    const matchesStatus = statusFilter === "All" || b.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
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
        <div className="flex gap-2 w-full max-w-md">
          <input
            type="text"
            placeholder="Search by doctor, patient, or ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm bg-white cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {selectedBookingIds.size > 0 && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-indigo-700">{selectedBookingIds.size} bookings selected</span>
          <button
            onClick={() => setIsBulkStatusModalOpen(true)}
            disabled={updatingId === 'bulk'} // Use updatingId to disable during bulk operation
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {updatingId === 'bulk' ? (
              <Spinner />
            ) : (
              'Update Status in Bulk'
            )}
          </button>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)]">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 shadow-sm">
            <tr className="text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="p-4 border-b">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                  checked={selectedBookingIds.size === filteredBookings.length && filteredBookings.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
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
                <td className="p-4">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                    checked={selectedBookingIds.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                  />
                </td>
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

      {/* Bulk Status Update Modal */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bulk Update Status</h3>
            <p className="text-sm text-gray-500 mb-6">Choose a new status for the {selectedBookingIds.size} selected bookings.</p>
            
            <div className="space-y-1 mb-6">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select New Status</label>
              <select
                value={bulkUpdateStatus}
                onChange={(e) => setBulkUpdateStatus(e.target.value as Booking['status'])}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-sm font-medium"
              >
                {["pending", "confirmed", "completed", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBulkStatusModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkStatusUpdate}
                disabled={updatingId === 'bulk'}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-200"
              >
                {updatingId === 'bulk' ? "Updating..." : "Update Bookings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (reusing the pattern from other tables) */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmModal.onConfirm} className={`px-6 py-2 text-white rounded-lg transition-colors text-sm font-bold cursor-pointer shadow-lg ${confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}