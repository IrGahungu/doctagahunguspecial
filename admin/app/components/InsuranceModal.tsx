"use client";

import { useState, useEffect } from "react";

type InsurancePlan = {
  type: string;
  price: number;
  description: string;
  coverage: string[];
};

type InsuranceLocation = {
  location: string;
  plans: InsurancePlan[];
};

type Insurance = {
  id: string;
  name: string;
  image?: string;
  locations?: InsuranceLocation[];
};

type InsuranceForm = {
  name: string;
  image: string;
  locations: InsuranceLocation[];
};

type InsuranceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingInsurance: Insurance | null;
  onSuccess: () => void;
};

export default function InsuranceModal({
  isOpen,
  onClose,
  editingInsurance,
  onSuccess,
}: InsuranceModalProps) {
  const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>({
    name: "",
    image: "",
    locations: [],
  });
  const [locationsJson, setLocationsJson] = useState("[]");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const isEditing = !!editingInsurance;
      const initialLocations = isEditing ? editingInsurance.locations || [] : [];

      setInsuranceForm({
        name: isEditing ? editingInsurance.name || "" : "",
        image: isEditing ? editingInsurance.image || "" : "",
        locations: initialLocations,
      });
      setLocationsJson(JSON.stringify(initialLocations, null, 2));
      setFormError(null);
    }
  }, [editingInsurance, isOpen]);

  if (!isOpen) return null;

  function handleInsuranceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setInsuranceForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleLocationsChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const jsonString = e.target.value;
    setLocationsJson(jsonString);
    try {
      const parsedLocations = JSON.parse(jsonString);
      setInsuranceForm((prev) => ({ ...prev, locations: parsedLocations }));
      setFormError(null);
    } catch (error) {
      setFormError("Invalid JSON for locations.");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "insurance-images"); // Specify the target bucket

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setInsuranceForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred during upload.";
      setFormError(message);
    } finally {
      setIsUploading(false);
    }
  }


  async function handleInsuranceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!insuranceForm.image) {
      setFormError("Please upload an image before saving!");
      setIsSubmitting(false);
      return;
    }

    try {
      JSON.parse(locationsJson);
    } catch (error) {
      setFormError("Cannot save. Invalid JSON for locations.");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = "/api/insurances";
      const method = editingInsurance ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingInsurance
            ? { ...insuranceForm, id: editingInsurance.id }
            : insuranceForm
        ),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save Insurance");

      onSuccess();
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to save insurance");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b shrink-0">
          <h3 className="text-lg font-semibold">{editingInsurance ? "Edit Insurance" : "Add Insurance"}</h3>
        </div>

        <form id="insurance-form" onSubmit={handleInsuranceSubmit} className="p-6 space-y-4 overflow-y-auto">
          <input type="text" name="name" placeholder="Insurance Name" value={insuranceForm.name} onChange={handleInsuranceChange} className="w-full border p-2 rounded" />
          <div>
            <label className="block text-sm font-medium text-gray-700">Insurance Image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 rounded" disabled={isUploading} />
            {isUploading && <p className="text-sm text-blue-600">Uploading...</p>}
          </div>
          {insuranceForm.image && <img src={insuranceForm.image} alt="Preview" className="w-32 h-32 object-cover rounded border" />}

          <div>
            <label className="block text-sm font-medium text-gray-700">Locations and Plans (JSON)</label>
            <textarea
              name="locations"
              placeholder="Enter locations and plans as a JSON array"
              value={locationsJson}
              onChange={handleLocationsChange}
              className="w-full border p-2 rounded font-mono text-sm"
              rows={8}
            />
          </div>
        </form>

        <div className="p-6 border-t shrink-0">
          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50" disabled={isSubmitting || isUploading}>Cancel</button>
            <button type="submit" form="insurance-form" className="px-4 py-2 bg-teal-600 text-white rounded disabled:bg-gray-400" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}