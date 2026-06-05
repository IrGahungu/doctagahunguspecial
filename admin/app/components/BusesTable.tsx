"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import BusModal from "./BusModal";

type Bus = {
  id: string;
  company: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  duration: string;
  bus_type: string;
  price: number;
  total_seats: number;
  booked_count?: number;
};

export default function BusesTable() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [busToDelete, setBusToDelete] = useState<string | null>(null);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/buses");
      const data = await res.json();
      setBuses(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load buses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const executeDelete = async () => {
    if (!busToDelete) return;
    try {
      const res = await fetch(`/api/admin/buses?id=${busToDelete}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBuses(prev => prev.filter(b => b.id !== busToDelete));
      toast.success("Bus deleted");
    } catch (err) {
      toast.error("Failed to delete bus");
    } finally {
      setBusToDelete(null);
    }
  };

  const openEdit = (bus: Bus) => {
    setEditingBus(bus);
    setModalOpen(true);
  };

  if (loading) return <div className="p-20 text-center text-gray-500">Loading buses...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Bus Schedules</h2>
          <p className="text-xs text-gray-500">Manage JK BUS routes and prices</p>
        </div>
        <button 
          onClick={() => { setEditingBus(null); setModalOpen(true); }}
          className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
        >
          + Add Bus Schedule
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)]">
        <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
          <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-100 shadow-sm">
            <tr className="text-gray-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="p-4 border-b">Company</th>
              <th className="p-4 border-b">Route</th>
              <th className="p-4 border-b">Departure</th>
              <th className="p-4 border-b">Duration</th>
              <th className="p-4 border-b">Type</th>
              <th className="p-4 border-b">Seats</th>
              <th className="p-4 border-b">Price</th>
              <th className="p-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {buses.map((bus) => (
              <tr key={bus.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-700">{bus.company}</td>
                <td className="p-4">
                  <div className="font-semibold">{bus.origin} → {bus.destination}</div>
                </td>
                <td className="p-4">
                  <div className="text-gray-900">{bus.departure_date}</div>
                  <div className="text-[10px] text-gray-500 font-medium">{bus.departure_time}</div>
                </td>
                <td className="p-4 text-gray-600">{bus.duration}</td>
                <td className="p-4"><span className="px-2 py-0.5 bg-gray-100 rounded text-[9px] font-bold uppercase">{bus.bus_type}</span></td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className={`font-bold text-sm ${(bus.total_seats - (bus.booked_count || 0)) <= 5 ? 'text-red-500' : 'text-slate-700'}`}>
                      {bus.total_seats - (bus.booked_count || 0)} left
                    </span>
                    <span className="text-[10px] text-gray-400">of {bus.total_seats} total</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-green-600">BIF {bus.price.toLocaleString()}</td>
                <td className="p-4 text-center space-x-3">
                  <button onClick={() => openEdit(bus)} className="btn-edit cursor-pointer">Edit</button>
                  <button onClick={() => setBusToDelete(bus.id)} className="btn-delete cursor-pointer">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BusModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editingBus={editingBus} onSuccess={fetchBuses} />

      {busToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this bus schedule? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBusToDelete(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer">
                Cancel
              </button>
              <button onClick={executeDelete} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold cursor-pointer shadow-lg shadow-red-100">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}