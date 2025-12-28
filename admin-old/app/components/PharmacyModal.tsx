"use client";

import { useState, useEffect } from "react";

type Insurance = {
  id: string;
  name: string;
};

type Location = {
  name: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean; // Admin sets open/closed
};

type Pharmacy = {
  id: string;
  name: string;
  image?: string;
  locations?: Location[];
  accepted_insurances?: string[];
};

type PharmacyForm = {
  name: string;
  image: string;
  locations: Location[];
  accepted_insurances: string[];
};

type PharmacyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingPharmacy: Pharmacy | null;
  onSuccess: () => void;
  allInsurances: Insurance[];
};

export default function PharmacyModal({
  isOpen,
  onClose,
  editingPharmacy,
  onSuccess,
  allInsurances,
}: PharmacyModalProps) {
  const [pharmacyForm, setPharmacyForm] = useState<PharmacyForm>({
    name: "",
    image: "",
    locations: [],
    accepted_insurances: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingPharmacy) {
        setPharmacyForm({
          name: editingPharmacy.name || "",
          image: editingPharmacy.image || "",
          locations: editingPharmacy.locations || [],
          accepted_insurances: editingPharmacy.accepted_insurances || [],
        });
      } else {
        setPharmacyForm({
          name: "",
          image: "",
          locations: [],
          accepted_insurances: [],
        });
      }
      setFormError(null);
    }
  }, [editingPharmacy, isOpen]);

  if (!isOpen) return null;

  function handlePharmacyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setPharmacyForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleInsuranceSelectionChange(insuranceName: string, isSelected: boolean) {
    if (!insuranceName) return;
    setPharmacyForm((prev) => {
      const currentInsurances = prev.accepted_insurances || [];
      if (isSelected) {
        if (!currentInsurances.includes(insuranceName)) {
          return { ...prev, accepted_insurances: [...currentInsurances, insuranceName] };
        }
      } else {
        return {
          ...prev,
          accepted_insurances: currentInsurances.filter((name) => name !== insuranceName),
        };
      }
      return prev;
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "pharmacy-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setPharmacyForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred during upload.";
      setFormError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handlePharmacySubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!pharmacyForm.image) {
      setFormError("Please upload an image before saving!");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = "/api/pharmacies";
      const method = editingPharmacy ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingPharmacy ? { ...pharmacyForm, id: editingPharmacy.id } : pharmacyForm
        ),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save Pharmacy");

      onSuccess();
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to save pharmacy");
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
        <div className="p-6 border-b shrink-0">
          <h3 className="text-lg font-semibold">
            {editingPharmacy ? "Edit Pharmacy" : "Add Pharmacy"}
          </h3>
        </div>

        {/* FORM */}
        <form
          id="pharmacy-form"
          onSubmit={handlePharmacySubmit}
          className="p-6 space-y-4 overflow-y-auto"
        >
          {/* Name */}
          <input
            type="text"
            name="name"
            placeholder="Pharmacy Name"
            value={pharmacyForm.name}
            onChange={handlePharmacyChange}
            className="w-full border p-2 rounded"
          />

          {/* Image Upload */}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full border p-2 rounded"
              disabled={isUploading}
            />
            {isUploading && <p className="text-sm text-blue-600">Uploading...</p>}
          </div>
          {pharmacyForm.image && (
            <img
              src={pharmacyForm.image}
              alt="Preview"
              className="w-32 h-32 object-cover rounded border"
            />
          )}

          {/* Locations */}
          <div>
            <label className="block text-sm font-medium">Locations</label>
            {pharmacyForm.locations.map((loc, index) => (
              <div key={index} className="border p-3 rounded mb-2">
                {/* Location Name */}
                <input
                  type="text"
                  placeholder="Location name"
                  value={loc.name}
                  onChange={(e) => {
                    const newLocs = [...pharmacyForm.locations];
                    newLocs[index].name = e.target.value;
                    setPharmacyForm({ ...pharmacyForm, locations: newLocs });
                  }}
                  className="w-full border p-2 rounded mb-2"
                />

                {/* Opening / Closing Time + Open/Closed Toggle */}
                <div className="flex space-x-2 items-center">
                  <input
                    type="time"
                    value={loc.openingTime}
                    onChange={(e) => {
                      const newLocs = [...pharmacyForm.locations];
                      newLocs[index].openingTime = e.target.value;
                      setPharmacyForm({ ...pharmacyForm, locations: newLocs });
                    }}
                    className="border p-2 rounded"
                  />
                  <input
                    type="time"
                    value={loc.closingTime}
                    onChange={(e) => {
                      const newLocs = [...pharmacyForm.locations];
                      newLocs[index].closingTime = e.target.value;
                      setPharmacyForm({ ...pharmacyForm, locations: newLocs });
                    }}
                    className="border p-2 rounded"
                  />

                  {/* Open/Closed Toggle */}
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={loc.isOpen}
                      onChange={(e) => {
                        const newLocs = [...pharmacyForm.locations];
                        newLocs[index].isOpen = e.target.checked;
                        setPharmacyForm({ ...pharmacyForm, locations: newLocs });
                      }}
                      className="h-4 w-4"
                    />
                    <span
                      className={`px-2 py-1 rounded text-white ${
                        loc.isOpen ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {loc.isOpen ? "Open" : "Closed"}
                    </span>
                  </label>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  className="text-sm text-red-600 mt-2"
                  onClick={() => {
                    setPharmacyForm({
                      ...pharmacyForm,
                      locations: pharmacyForm.locations.filter((_, i) => i !== index),
                    });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Add Location */}
            <button
              type="button"
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
              onClick={() =>
                setPharmacyForm({
                  ...pharmacyForm,
                  locations: [
                    ...pharmacyForm.locations,
                    { name: "", openingTime: "09:00", closingTime: "17:00", isOpen: false },
                  ],
                })
              }
            >
              + Add Location
            </button>
          </div>

          {/* Insurances */}
          <div>
            <label className="block text-sm font-medium">Accepted Insurances</label>
            <div className="border p-2 rounded max-h-40 overflow-y-auto space-y-1">
              {allInsurances.map((insurance) => (
                <div key={insurance.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`insurance-${insurance.id}`}
                    checked={pharmacyForm.accepted_insurances.includes(insurance.name || "")}
                    onChange={(e) =>
                      handleInsuranceSelectionChange(insurance.name || "", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    disabled={!insurance.name}
                  />
                  <label
                    htmlFor={`insurance-${insurance.id}`}
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {insurance.name}
                  </label>
                </div>
              ))}
              {allInsurances.length === 0 && (
                <p className="text-sm text-gray-500">
                  No insurances available. Add insurances first.
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t shrink-0">
          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
              disabled={isSubmitting || isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="pharmacy-form"
              className="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-400"
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
