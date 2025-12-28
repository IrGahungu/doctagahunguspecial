"use client";

import { useState, useEffect } from "react";

type Availability = {
  date: string; // "2025-09-10"
  times: string[]; // ["09:00", "10:00"]
};

type Doctor = {
  id: string;
  name: string;
  specialty?: string;
  location?: string[];
  bio?: string;
  booking_type?: "online" | "in-office" | "both";
  availability: Availability[];
  image?: string;
};

type DoctorForm = Omit<Doctor, "id"> & {
  location: string[]; // always defined
};

type DoctorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingDoctor: Doctor | null;
  onSuccess: () => void;
};

export default function DoctorModal({
  isOpen,
  onClose,
  editingDoctor,
  onSuccess,
}: DoctorModalProps) {
  const [doctorForm, setDoctorForm] = useState<DoctorForm>({
    name: "",
    specialty: "",
    location: [],
    bio: "",
    booking_type: "online",
    availability: [],
    image: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Reset form when modal opens or editingDoctor changes
  useEffect(() => {
    if (isOpen) {
      if (editingDoctor) {
        setDoctorForm({
          name: editingDoctor.name || "",
          specialty: editingDoctor.specialty || "",
          location: editingDoctor.location || [],
          bio: editingDoctor.bio || "",
          booking_type: editingDoctor.booking_type || "online",
          availability: editingDoctor.availability || [],
          image: editingDoctor.image || "",
        });
      } else {
        setDoctorForm({
          name: "",
          specialty: "",
          location: [],
          bio: "",
          booking_type: "online",
          availability: [],
          image: "",
        });
      }
      setFormError(null);
    }
  }, [editingDoctor, isOpen]);

  if (!isOpen) return null;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setDoctorForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "doctor-images");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setDoctorForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed unexpectedly");
    } finally {
      setIsUploading(false);
    }
  }

  // ------------------ Locations ------------------
  function handleAddLocation() {
    setDoctorForm((prev) => ({ ...prev, location: [...prev.location, ""] }));
  }

  function handleRemoveLocation(index: number) {
    setDoctorForm((prev) => ({
      ...prev,
      location: prev.location.filter((_, i) => i !== index),
    }));
  }

  function handleLocationChange(index: number, value: string) {
    const updated = [...doctorForm.location];
    updated[index] = value;
    setDoctorForm((prev) => ({ ...prev, location: updated }));
  }

  // ------------------ Availability ------------------
  function handleAddAvailability() {
    setDoctorForm((prev) => ({
      ...prev,
      availability: [...prev.availability, { date: "", times: [] }],
    }));
  }

  function handleRemoveAvailability(index: number) {
    setDoctorForm((prev) => ({
      ...prev,
      availability: prev.availability.filter((_, i) => i !== index),
    }));
  }

  function handleAvailabilityChange(
    index: number,
    field: "date" | "times",
    value: string
  ) {
    const updated = [...doctorForm.availability];
    if (field === "date") {
      updated[index].date = value;
    } else {
      updated[index].times = value.split(",").map((t) => t.trim());
    }
    setDoctorForm((prev) => ({ ...prev, availability: updated }));
  }

  // ------------------ Submit ------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!doctorForm.image) {
      setFormError("Please upload an image");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = "/api/doctors";
      const method = editingDoctor ? "PUT" : "POST";
      const body = editingDoctor
        ? { ...doctorForm, id: editingDoctor.id }
        : doctorForm;

      // Remove empty locations before saving
      body.location = body.location.filter((loc) => loc.trim() !== "");

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save doctor");

      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save doctor");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">
            {editingDoctor ? "Edit Doctor" : "Add Doctor"}
          </h3>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto"
          id="doctor-form"
        >
          <input
            type="text"
            name="name"
            placeholder="Doctor Name"
            value={doctorForm.name}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            type="text"
            name="specialty"
            placeholder="Specialty"
            value={doctorForm.specialty}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          {/* --------- Locations Section --------- */}
          <div>
            <label className="block font-medium">Locations</label>
            {doctorForm.location.map((loc, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Location"
                  value={loc}
                  onChange={(e) => handleLocationChange(idx, e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLocation(idx)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddLocation}
              className="px-3 py-1 bg-blue-600 text-white rounded mt-2"
            >
              + Add Location
            </button>
          </div>

          <textarea
            name="bio"
            placeholder="Bio"
            value={doctorForm.bio}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <select
            name="booking_type"
            value={doctorForm.booking_type}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="online">Online</option>
            <option value="in-office">In Office</option>
            <option value="both">Both</option>
          </select>

          {/* --------- Availability Section --------- */}
          <div>
            <label className="block font-medium">Availability</label>
            {doctorForm.availability.map((a, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="date"
                  value={a.date}
                  onChange={(e) => handleAvailabilityChange(idx, "date", e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <input
                  type="text"
                  placeholder="Times (e.g. 09:00, 10:00)"
                  value={a.times.join(", ")}
                  onChange={(e) => handleAvailabilityChange(idx, "times", e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAvailability(idx)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddAvailability}
              className="px-3 py-1 bg-blue-600 text-white rounded mt-2"
            >
              + Add Availability
            </button>
          </div>

          {/* --------- Image Upload --------- */}
          <div>
            <label className="block text-sm font-medium">Doctor Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="w-full border p-2 rounded"
            />
            {isUploading && <p className="text-sm text-blue-600">Uploading...</p>}
          </div>
          {doctorForm.image && (
            <img
              src={doctorForm.image}
              alt="Preview"
              className="w-full h-auto rounded border"
            />
          )}
        </form>

        <div className="p-6 border-t flex justify-end gap-2">
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded"
            disabled={isSubmitting || isUploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="doctor-form"
            className="px-4 py-2 bg-green-600 text-white rounded"
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
