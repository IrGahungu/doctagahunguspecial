"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type BusBooking = {
  id: string;
  user_id: string;
  bus_id: string;
  seat_number: number;
  travel_date: string;
  status: "holding" | "pending" | "confirmed" | "cancelled";
  ticket_number?: string;
  created_at: string;
  users?: {
    fullname: string;
    whatsapp_number: string;
  };
  buses?: {
    company: string;
    origin: string;
    destination: string;
    departure_time: string;
    price: number;
  };
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function BusBookingsTable() {
  const [bookings, setBookings] = useState<BusBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<BusBooking["status"]>("confirmed");
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; type: 'delete' | 'update' } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings?type=bus");
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to fetch bus bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id: string, status: BusBooking["status"]) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, type: 'bus' }),
      });
      if (!res.ok) throw new Error();
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      toast.success(`Booking ${status}`);
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  function handleBulkStatusUpdate() {
    if (selectedIds.size === 0) return;
    setIsBulkStatusModalOpen(false);
    setConfirmModal({
      title: "Confirm Bulk Status Update",
      message: `Are you sure you want to update the status of ${selectedIds.size} bookings to "${bulkUpdateStatus}"?`,
      onConfirm: executeBulkUpdate,
      type: 'update'
    });
  }

  async function executeBulkUpdate() {
    const ids = Array.from(selectedIds);
    setConfirmModal(null);
    setUpdatingId('bulk');
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: bulkUpdateStatus, type: 'bus' }),
      });
      if (!res.ok) throw new Error();
      
      setBookings(prev => prev.map(b => 
        ids.includes(b.id) ? { ...b, status: bulkUpdateStatus } : b
      ));
      
      toast.success(`Successfully updated status for ${ids.length} bookings`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error("Bulk update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  const handleDownloadTicket = (b: BusBooking) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>JK BUS Ticket - ${b.ticket_number || b.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .ticket { border: 2px dashed #000; padding: 30px; border-radius: 15px; max-width: 500px; margin: auto; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: 900; color: #1a1a1a; margin: 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; }
            .col { flex: 1; }
            .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
            .value { font-weight: bold; font-size: 16px; color: #111; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #eee; pt: 15px; }
            .ticket-ref { font-family: monospace; font-size: 20px; color: #16a34a; font-bold; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <div class="logo">JK BUS</div>
              <div class="label">Boarding Pass</div>
              <div class="ticket-ref">${b.ticket_number || b.id.substring(0, 8).toUpperCase()}</div>
            </div>
            <div class="row">
              <div class="col"><div class="label">Passenger</div><div class="value">${b.users?.fullname || 'Guest'}</div></div>
              <div class="col" style="text-align:right"><div class="label">Seat No.</div><div class="value" style="font-size:24px">${b.seat_number}</div></div>
            </div>
            <div class="row">
              <div class="col"><div class="label">Route</div><div class="value">${b.buses?.origin} → ${b.buses?.destination}</div></div>
            </div>
            <div class="row">
              <div class="col"><div class="label">Departure Date</div><div class="value">${b.travel_date}</div></div>
              <div class="col" style="text-align:right"><div class="label">Time</div><div class="value">${b.buses?.departure_time}</div></div>
            </div>
            <div class="footer"><p>Please arrive at the terminal 30 minutes before departure.<br/>Powered by Gahungu and Melana App</p></div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filtered = bookings.filter(b => {
    const query = searchQuery.toLowerCase();
    const passengerName = b.users?.fullname?.toLowerCase() || "";
    const ticketRef = b.ticket_number?.toLowerCase() || "";
    const destination = b.buses?.destination?.toLowerCase() || "";
    const matchesSearch = passengerName.includes(query) || ticketRef.includes(query) || destination.includes(query);
    const matchesStatus = statusFilter === "All" || b.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(b => b.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Analytics Processing
  const prepareChartData = (): { date: string; total: number }[] => {
    if (!startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    let curr = new Date(start);

    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const revenueMap: Record<string, number> = dates.reduce((acc, date) => ({ ...acc, [date]: 0 }), {} as Record<string, number>);

    bookings.filter(b => b.status === 'confirmed').forEach(b => {
      const date = b.created_at.split('T')[0];
      if (revenueMap[date] !== undefined) {
        revenueMap[date] += b.buses?.price || 0;
      }
    });

    return Object.entries(revenueMap).map(([date, total]) => ({ date, total }));
  };

  const chartData = prepareChartData();
  const rangeRevenue = chartData.reduce((sum, item) => sum + item.total, 0);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading bookings...</div>;

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Bus Revenue Analytics</h3>
            <div className="text-2xl font-bold text-zinc-800 mt-1">BIF {rangeRevenue.toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">From</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-zinc-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">To</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-zinc-500 outline-none"
              />
            </div>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(str: string) => str.split('-').slice(1).join('/')} />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip formatter={(value) => [`BIF ${Number(value ?? 0).toLocaleString()}`,"Revenue"]}/>
              <Bar dataKey="total" fill="#52525b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Bus Bookings</h2>
          <p className="text-xs text-gray-500">Manage passenger reservations and tickets</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedIds.size > 0 && (
            <button 
              onClick={() => setIsBulkStatusModalOpen(true)}
              disabled={updatingId === 'bulk'}
              className="bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-800 flex items-center gap-2 transition-all animate-in fade-in zoom-in cursor-pointer"
            >
              {updatingId === 'bulk' ? <Spinner /> : `Update ${selectedIds.size} Statuses`}
            </button>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 text-sm bg-white cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="holding">Holding</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="text"
            placeholder="Search passenger or ticket..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-500 outline-none w-full md:w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-zinc-200">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 shadow-sm">
            <tr className="text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="p-4 border-b">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-zinc-600 focus:ring-zinc-500 w-4 h-4 cursor-pointer"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-4 border-b">Ticket Ref</th>
              <th className="p-4 border-b">Passenger</th>
              <th className="p-4 border-b">Route</th>
              <th className="p-4 border-b">Travel Date</th>
              <th className="p-4 border-b">Seat</th>
              <th className="p-4 border-b">Status</th>
              <th className="p-4 border-b">Ticket</th>
              <th className="p-4 border-b text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-zinc-600 focus:ring-zinc-500 w-4 h-4 cursor-pointer"
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                  />
                </td>
                <td className="p-4 font-mono text-[10px] font-bold text-zinc-600">
                  {b.ticket_number || `#${b.id.substring(0, 8)}`}
                </td>
                <td className="p-4">
                  <div className="font-semibold text-gray-900">{b.users?.fullname || "Guest"}</div>
                  <div className="text-[10px] text-gray-500">{b.users?.whatsapp_number}</div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-zinc-700">{b.buses?.origin} → {b.buses?.destination}</div>
                  <div className="text-[10px] text-gray-400">{b.buses?.company}</div>
                </td>
                <td className="p-4">
                  <div className="text-gray-900">{b.travel_date}</div>
                  <div className="text-[10px] text-gray-500">{b.buses?.departure_time}</div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 font-bold text-zinc-700 border border-zinc-200">
                    {b.seat_number}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full border capitalize ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                    b.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    b.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="p-4">
                  {b.status === 'confirmed' ? (
                    <button 
                      onClick={() => handleDownloadTicket(b)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-[10px] uppercase border border-blue-200 px-2 py-1 rounded bg-blue-50 cursor-pointer"
                    >
                      Print
                    </button>
                  ) : <span className="text-gray-300 text-[10px] italic">Available on confirmation</span>}
                </td>
                <td className="p-4">
                  <div className="flex flex-col items-center gap-1">
                    <select
                      value={b.status}
                      onChange={(e) => updateStatus(b.id, e.target.value as any)}
                      disabled={updatingId === b.id}
                      className="text-[10px] font-bold py-1 px-2 border rounded-md focus:ring-1 focus:ring-zinc-500 outline-none cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirm</option>
                      <option value="cancelled">Cancel</option>
                    </select>
                    {updatingId === b.id && <Spinner />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

      {/* Bulk Status Update Modal */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bulk Update Status</h3>
            <p className="text-sm text-gray-500 mb-6">Choose a new status for the {selectedIds.size} selected bookings.</p>
            
            <div className="space-y-1 mb-6">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select New Status</label>
              <select
                value={bulkUpdateStatus}
                onChange={(e) => setBulkUpdateStatus(e.target.value as BusBooking['status'])}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zinc-500 outline-none cursor-pointer text-sm font-medium"
              >
                {["holding", "pending", "confirmed", "cancelled"].map((s) => (
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
                className="px-6 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-bold disabled:opacity-50 cursor-pointer shadow-lg shadow-zinc-200"
              >
                {updatingId === 'bulk' ? "Updating..." : "Update Bookings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmModal.onConfirm} className={`px-6 py-2 text-white rounded-lg transition-colors text-sm font-bold cursor-pointer shadow-lg ${confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-zinc-700 hover:bg-zinc-800 shadow-zinc-100'}`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}