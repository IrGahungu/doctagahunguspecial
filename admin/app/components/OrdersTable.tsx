"use client";

import { useEffect, useState } from "react";

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
          prev.map((order) => (order.id === orderId ? { ...order, status: updatedOrder.status } : order))
        );
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

  useEffect(() => {
    fetchOrders();
  }, []);

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
      <h2 className="text-2xl font-bold mb-4">Manage Orders</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] border-collapse border border-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Order ID</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Customer</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Date</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Total Amount</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Status</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Items</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="align-top">
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
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500" role="status">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}