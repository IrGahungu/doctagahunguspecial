"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OrderItem = {
  id: string;
  medicine_name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  user_fullname: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
};

export default function OrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      setOrder(data);
      setLoading(false);
    }
    fetchOrder();
  }, [id]);

  if (loading) return <p>Loading order details...</p>;
  if (!order) return <p>Order not found.</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <button
        onClick={() => router.back()}
        className="mb-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold mb-4">Order Details</h2>

      <div className="mb-6">
        <p><strong>Order ID:</strong> {order.id}</p>
        <p><strong>Customer:</strong> {order.user_fullname}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
        <p><strong>Total:</strong> BIF {order.total_amount.toFixed(2)}</p>
      </div>

      <h3 className="text-lg font-semibold mb-2">Items</h3>
      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Medicine</th>
            <th className="p-2">Quantity</th>
            <th className="p-2">Price</th>
            <th className="p-2">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-2">{item.medicine_name}</td>
              <td className="p-2">{item.quantity}</td>
              <td className="p-2">BIF {item.price.toFixed(2)}</td>
              <td className="p-2">
                BIF {(item.quantity * item.price).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
