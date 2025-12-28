"use client";

import { useState, useEffect } from "react";

type Hospital = {
  id: string;
  name: string;
  image?: string;
  location?: string[];
  specialties?: string[];
  insurances?: string[];
  blood_types?: string[];
};

type HospitalForm = {
  name: string;
  image: string;
  location: string[];
  specialties: string[];
  insurances: string[];
  blood_types: string[];
};

type HospitalListField = "location" | "specialties" | "insurances" | "blood_types";

type HospitalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingHospital: Hospital | null;
  onSuccess: () => void;
};

export default function HospitalModal({
  isOpen,
  onClose,
  editingHospital,
  onSuccess,
}: HospitalModalProps) {
  const [hospitalForm, setHospitalForm] = useState<HospitalForm>({
    name: "",
    image: "",
    location: [],
    specialties: [],
    insurances: [],
    blood_types: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingHospital) {
        setHospitalForm({
          name: editingHospital.name || "",
          image: editingHospital.image || "",
          location: editingHospital.location || [],
          specialties: editingHospital.specialties || [],
          insurances: editingHospital.insurances || [],
          blood_types: editingHospital.blood_types || [],
        });
      } else {
        setHospitalForm({
          name: "",
          image: "",
          location: [],
          specialties: [],
          insurances: [],
          blood_types: [],
        });
      }
      setFormError(null);
    }
  }, [editingHospital, isOpen]);

  if (!isOpen) return null;

  function handleListChange(field: HospitalListField, index: number, value: string) {
    const updatedList = [...hospitalForm[field]];
    updatedList[index] = value;
    setHospitalForm((prev) => ({ ...prev, [field]: updatedList }));
  }

  function addListItem(field: HospitalListField) {
    setHospitalForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  }

  function removeListItem(field: HospitalListField, index: number) {
    setHospitalForm((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "hospital-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setHospitalForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      setFormError("Image upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function validateForm(): boolean {
    if (!hospitalForm.name.trim()) {
      setFormError("Hospital name is required");
      return false;
    }
    if (!hospitalForm.image) {
      setFormError("Hospital image is required");
      return false;
    }

    const listFields: HospitalListField[] = [
      "location",
      "specialties",
      "insurances",
      "blood_types",
    ];

    const cleanedForm = { ...hospitalForm };

    for (const field of listFields) {
      const cleanedList = cleanedForm[field].filter((item) => item.trim() !== "");
      cleanedForm[field] = cleanedList;

      if (cleanedList.length === 0) {
        setFormError(`At least one ${field.replace("_", " ")} is required`);
        return false;
      }
    }

    setHospitalForm(cleanedForm);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = "/api/hospitals";
      const method = editingHospital ? "PUT" : "POST";
      const payload = editingHospital
        ? { ...hospitalForm, id: editingHospital.id }
        : hospitalForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save data");
      onSuccess();
    } catch {
      setFormError("Error saving hospital");
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
        className="bg-white rounded-lg w-full max-w-md flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b">
          <h2 className="text-md font-semibold">
            {editingHospital ? "Edit Hospital" : "Add Hospital"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium">Hospital Name</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={hospitalForm.name}
              onChange={(e) =>
                setHospitalForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Hospital Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="w-full border p-2 rounded"
            />
            {isUploading && (
              <p className="text-sm text-blue-600 mt-1">Uploading...</p>
            )}

            {hospitalForm.image && (
              <img
                src={hospitalForm.image}
                alt="Preview"
                className="w-32 h-32 mt-2 object-cover rounded border"
              />
            )}
          </div>

          {/* Dynamic List Sections */}
          {[
            { field: "location", label: "Locations" },
            { field: "specialties", label: "Specialties" },
            { field: "insurances", label: "Insurances" },
            { field: "blood_types", label: "Blood Types" },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-sm font-medium">{label}</label>
              {(hospitalForm[field as HospitalListField]).map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) =>
                      handleListChange(field as HospitalListField, index, e.target.value)
                    }
                    className="flex-1 border p-2 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeListItem(field as HospitalListField, index)}
                    className="px-3 bg-red-500 text-white rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addListItem(field as HospitalListField)}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                + Add {label.slice(0, -1)}
              </button>
            </div>
          ))}
        </form>

        <div className="p-6 border-t">
          {formError && <p className="text-red-500">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
