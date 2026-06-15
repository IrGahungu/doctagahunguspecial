"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

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
};

type BusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingBus: Bus | null;
  onSuccess: () => void;
};

export default function BusModal({ isOpen, onClose, editingBus, onSuccess }: BusModalProps) {
  const [form, setForm] = useState<Partial<Bus>>({
    company: "JK BUS",
    bus_type: "Standard",
    origin: "",
    destination: "",
    departure_date: "",
    departure_time: "",
    duration: "",
    price: 0,
    total_seats: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingBus) setForm(editingBus);
    else setForm({ company: "JK BUS", bus_type: "Standard", origin: "", destination: "", departure_date: "", departure_time: "", duration: "", price: 0, total_seats: 0 });
  }, [editingBus, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingBus ? `/api/admin/buses?id=${editingBus.id}` : "/api/admin/buses";
      const method = editingBus ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error("Failed to save bus");
        return;
      }
      toast.success(editingBus ? "Bus updated" : "Bus added");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Error saving bus");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{editingBus ? "Edit Bus" : "Add New Bus"}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company</label>
              <input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
              <input required value={form.bus_type} onChange={e => setForm({ ...form, bus_type: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Origin</label>
              <input required value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
              <input required value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
              <input required type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
              <input required type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration</label>
              <input required placeholder="e.g. 3h 30m" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full border p-2 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (BIF)</label>
              <input required type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="w-full border p-2 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Seats</label>
            <input 
              required 
              type="number" 
              min="1" 
              value={form.total_seats ?? 0} 
              onChange={e => setForm({ ...form, total_seats: Number(e.target.value) })} 
              className="w-full border p-2 rounded-lg text-sm" 
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button disabled={loading} type="submit" className="flex-1 py-2 bg-slate-600 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50">
              {loading ? "Saving..." : editingBus ? "Update Schedule" : "Add Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}