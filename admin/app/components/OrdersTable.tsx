"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Order = {
  id: string;
  user_fullname: string;
  total_amount: string;
  status: "Pending" | "Packed" | "Delivered" | "Cancelled";
  product_names: string[];
  created_at: string;
};

const statusOptions: Order["status"][] = [
  "Pending",
  "Packed",
  "Delivered",
  "Cancelled",
];

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) {
        const text = await res.text();
        console.error("Server returned:", text);
        throw new Error(`Failed to fetch orders`);
      }
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (loading) return <p>Loading orders...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Manage Orders</h2>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
        >
          Refresh Orders
        </button>
      </div>

      <table className="w-full text-left text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Order ID</th>
            <th className="p-2">Customer</th>
            <th className="p-2">Date</th>
            <th className="p-2">Products</th>
            <th className="p-2">Total</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t hover:bg-gray-50 cursor-pointer">
              <td className="p-2 font-mono text-xs text-blue-600 underline">
                <Link href={`/admin/orders/${order.id}`}>{order.id}</Link>
              </td>
              <td className="p-2">{order.user_fullname}</td>
              <td className="p-2">{new Date(order.created_at).toLocaleDateString()}</td>
              <td className="p-2">
                {order.product_names.join(", ")}
              </td>
              <td className="p-2">
                BIF {parseFloat(order.total_amount).toFixed(2)}
              </td>
              <td className="p-2">
                <select
                  value={order.status}
                  onChange={(e) =>
                    handleStatusChange(order.id, e.target.value as Order["status"])
                  }
                  className="border p-1 rounded"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}
