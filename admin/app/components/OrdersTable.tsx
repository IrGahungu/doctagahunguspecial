"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "react-hot-toast";

const MEDICINE_URL_PREFIX = "https://sqwoawoyzicvbebpgweu.supabase.co/storage/v1/object/public/medicine-images/";

type OrderItem = {
  id: string;
  stock_id: string;
  quantity: number;
  price: number;
  product_name: string;
  pharmacy_name: string;
  product_image_url?: string;
};

type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  subtotal: number;
  service_fee: number;
  user_id: string;
  customer_name: string;
  status: "Pending" | "Accepted" | "Cancelled" | "Packed" | "On the way" | "Delivered";
  items: OrderItem[];
};

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<Order['status']>("Accepted");
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Enable drag-to-scroll horizontally to make navigation easier in the middle of the table
  useEffect(() => {
    const slider = tableContainerRef.current;
    if (!slider) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      // Avoid dragging if the user is clicking on interactive elements
      if ((e.target as HTMLElement).closest('button, input, select, label, details, .cursor-pointer')) return;
      isDown = true;
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const handleMouseLeave = () => { isDown = false; };
    const handleMouseUp = () => { isDown = false; };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5; 
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mouseleave', handleMouseLeave);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mousemove', handleMouseMove);

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('mouseleave', handleMouseLeave);
      slider.removeEventListener('mouseup', handleMouseUp);
      slider.removeEventListener('mousemove', handleMouseMove);
    };
  }, [loading]);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders"); // Call the new API route
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        let errorMessage = res.statusText;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) {
          // Ignore JSON parsing errors if the body is not JSON
        }
        console.error("Failed to fetch orders:", errorMessage);
        setError(`Failed to load orders: ${errorMessage}. Please ensure you are logged in as an administrator.`);
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(orderId: string, newStatus: Order['status']) {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? { ...order, status: updatedOrder.status || newStatus } : order))
        );
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        let errorMessage = "Failed to update order status";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) { /* Ignore */ }
        console.error("Failed to update order status:", errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while updating.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function handleBulkStatusUpdate() {
    if (selectedOrderIds.size === 0) return;
    setIsBulkStatusModalOpen(false);
    setConfirmModal({
      title: "Confirm Bulk Update",
      message: `Are you sure you want to update the status of ${selectedOrderIds.size} orders to "${bulkUpdateStatus}"?`,
      onConfirm: executeBulkUpdate
    });
  }

  async function executeBulkUpdate() {
    setIsSubmitting(true);
    setConfirmModal(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedOrderIds),
          status: bulkUpdateStatus,
        }),
      });

      if (res.ok) {
        setOrders(prev =>
          prev.map(order =>
            selectedOrderIds.has(order.id) ? { ...order, status: bulkUpdateStatus } : order
          )
        );
        setSelectedOrderIds(new Set());
        setIsBulkStatusModalOpen(false);
        toast.success(`Successfully updated status for ${selectedOrderIds.size} orders.`);
      } else {
        let errorMessage = "Failed to bulk update orders";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) { /* Ignore */ }
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during bulk update.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(order => order.id)));
    }
  };

  const toggleSelect = (orderId: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(orderId)) next.delete(orderId);
    else next.add(orderId);
    setSelectedOrderIds(next);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = (order.customer_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      String(order.id).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColorClass = (status: Order['status']) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-700";
      case "Accepted": return "bg-blue-100 text-blue-700";
      case "Packed": return "bg-orange-100 text-orange-700";
      case "On the way": return "bg-purple-100 text-purple-700";
      case "Delivered": return "bg-green-100 text-green-700";
      case "Cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Manage Orders</h2>
          {!loading && orders.length > 0 && (
            <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">
              {(searchQuery || statusFilter !== "All") ? `${filteredOrders.length}/${orders.length}` : orders.length}
            </span>
          )}
        </div>
        <div className="flex gap-2 w-full max-w-md">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Packed">Packed</option>
            <option value="On the way">On the way</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <input
            type="text"
            placeholder="Search by ID or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {selectedOrderIds.size > 0 && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-indigo-700">{selectedOrderIds.size} orders selected</span>
          <button
            onClick={() => setIsBulkStatusModalOpen(true)}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Update Status in Bulk
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <div 
          ref={tableContainerRef}
          className="bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border border-gray-200"
        >
          <table className="w-full text-left min-w-[800px] border-collapse border border-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-20">
              <tr>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200 sticky left-0 bg-gray-100 z-30">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                    checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Order ID</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Customer</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Date</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Total Amount</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Status</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Items</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="p-3 text-sm text-gray-800 border border-gray-200 sticky left-0 bg-white z-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 cursor-pointer"
                      checked={selectedOrderIds.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                    />
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">#{String(order.id).substring(0, 8)}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{order.customer_name}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">BIF {order.total_amount.toLocaleString()}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    <div className="relative inline-block">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value as Order['status'])}
                        disabled={updatingOrderId === order.id}
                        className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50 ${getStatusColorClass(order.status)}`}
                      >
                        {["Pending", "Accepted", "Packed", "On the way", "Delivered", "Cancelled"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
                        {updatingOrderId === order.id ? (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    <details className="group cursor-pointer">
                      <summary className="text-indigo-600 text-sm font-medium hover:text-indigo-800 list-none flex items-center gap-1">
                        <span>View {order.items.length} Items</span>
                        <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs shadow-inner">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 py-1 border-b border-gray-200 last:border-0">
                            <img 
                              src={
                                item.product_image_url?.startsWith('http') 
                                  ? item.product_image_url 
                                  : item.product_image_url 
                                    ? `${MEDICINE_URL_PREFIX}${item.product_image_url}`
                                    : 'https://via.placeholder.com/40?text=No+Img'
                              } 
                              alt={item.product_name} 
                              className="w-8 h-8 object-cover rounded bg-gray-100" 
                            />
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{item.quantity}x {item.product_name}</span>
                              <span className="text-[10px] text-gray-500 uppercase font-semibold">From: {item.pharmacy_name}</span>
                            </div>
                            <span className="ml-auto">BIF {(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500" role="status">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bulk Update Status</h3>
            <p className="text-sm text-gray-500 mb-6">Choose a new status for the {selectedOrderIds.size} selected orders.</p>
            
            <div className="space-y-1 mb-6">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select New Status</label>
              <select
                value={bulkUpdateStatus}
                onChange={(e) => setBulkUpdateStatus(e.target.value as Order['status'])}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-sm font-medium"
              >
                {["Pending", "Accepted", "Packed", "On the way", "Delivered", "Cancelled"].map((s) => (
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
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-200"
              >
                {isSubmitting ? "Updating..." : "Update Orders"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmModal.onConfirm} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold cursor-pointer shadow-lg shadow-indigo-100">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}