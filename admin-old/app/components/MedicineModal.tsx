"use client";

import { useState, useEffect } from "react";

type Category = {
  id: string;
  name: string;
};

type PharmacyLocation = {
  name: string;
  openingTime?: string;
  closingTime?: string;
  isOpen?: boolean;
};

type Pharmacy = {
  id: string;
  name: string;
  image?: string;
  locations?: PharmacyLocation[];  // ✅ structured locations
  accepted_insurances?: string[];
};


type Medicine = {
  name: string;
  id: string;
  title: string;
  price: number;
  original_price?: number | null;
  image?: string | null;
  category_id?: string | null;
  description?: string | null;
  pharmacies?: any[] | null;
};

type MedicineForm = Omit<Medicine, "id">;

type MedicineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingMedicine: Medicine | null;
  onSuccess: () => void;
  categories: Category[];
  allPharmacies: Pharmacy[];
};

const initialFormState: MedicineForm = {
  name: "",
  title: "",
  price: 0,
  original_price: undefined,
  image: "",
  category_id: "",
  description: "",
  pharmacies: [],
};

export default function MedicineModal({
  isOpen,
  onClose,
  editingMedicine,
  onSuccess,
  categories,
  allPharmacies,
}: MedicineModalProps) {
  const [medicineForm, setMedicineForm] = useState<MedicineForm>(
    initialFormState
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingMedicine) {
        setMedicineForm({
          name: editingMedicine.name || "",
          title: editingMedicine.title || "",
          price: editingMedicine.price || 0,
          original_price: editingMedicine.original_price,
          image: editingMedicine.image || "",
          category_id: editingMedicine.category_id || "",
          description: editingMedicine.description || "",
          pharmacies: editingMedicine.pharmacies || [],
        });
      } else {
        setMedicineForm(initialFormState);
      }
      setFormError(null);
    }
  }, [editingMedicine, isOpen]);

  if (!isOpen) return null;

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value, type } = e.target;
    const isNumberField = type === "number";

    setMedicineForm((prev) => ({
      ...prev,
      [name]: isNumberField
        ? value === ""
          ? undefined
          : parseFloat(value)
        : value,
    }));
  }

  function handlePharmacySelectionChange(pharmacy: Pharmacy, isSelected: boolean) {
    setMedicineForm((prev) => {
      const currentPharmacies = prev.pharmacies || [];
      if (isSelected) {
        if (!currentPharmacies.some((p) => p.id === pharmacy.id)) {
          const newPharmacyForMedicine = {
            id: pharmacy.id,
            name: pharmacy.name,
            image: pharmacy.image,
            insurances: [],
            locations: [],
          };
          return { ...prev, pharmacies: [...currentPharmacies, newPharmacyForMedicine] };
        }
      } else {
        return {
          ...prev,
          pharmacies: currentPharmacies.filter((p) => p.id !== pharmacy.id),
        };
      }
      return prev;
    });
  }

  function handleMedicinePharmacyInsuranceChange(
    pharmacyId: string,
    insuranceName: string,
    isSelected: boolean
  ) {
    setMedicineForm((prev) => {
      const updatedPharmacies = (prev.pharmacies || []).map((p) => {
        if (p.id === pharmacyId) {
          const currentInsurances = p.insurances || [];
          let newInsurances;
          if (isSelected) {
            newInsurances = [...currentInsurances, insuranceName];
          } else {
            newInsurances = currentInsurances.filter(
              (name: string) => name !== insuranceName
            );
          }
          return { ...p, insurances: [...newInsurances] };
        }
        return p;
      });
      return { ...prev, pharmacies: updatedPharmacies };
    });
  }

  function handleMedicinePharmacyLocationChange(
    pharmacyId: string,
    locationName: string,
    isSelected: boolean
  ) {
    setMedicineForm((prev) => {
      const updatedPharmacies = (prev.pharmacies || []).map((p) => {
        if (p.id === pharmacyId) {
          const currentLocations = p.locations || [];
          let newLocations;
          if (isSelected) {
            newLocations = [...currentLocations, locationName];
          } else {
            newLocations = currentLocations.filter((name: string) => name !== locationName);
          }
          return { ...p, locations: [...newLocations] };
        }
        return p;
      });
      return { ...prev, pharmacies: updatedPharmacies };
    });
  }


  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "medicine-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setMedicineForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Upload failed unexpectedly"
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!medicineForm.image) {
      setFormError("Please upload an image");
      setIsSubmitting(false);
      return;
    }
    if (!medicineForm.title || !medicineForm.price || medicineForm.price <= 0) {
      setFormError("Please fill in title and a valid price.");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = "/api/medicines";
      const method = editingMedicine ? "PUT" : "POST";

      // ✅ Ensure pharmacies are included
      const body = {
        ...medicineForm,
        ...(editingMedicine ? { id: editingMedicine.id } : {}),
        pharmacies: (medicineForm.pharmacies || []).map((p: any) => ({
          id: p.id,
          insurances: p.insurances || [],
          locations: p.locations || [],
        })),
      };

      console.log("Submitting medicine to API:", body);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save medicine");

      onSuccess();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save medicine"
      );
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
            {editingMedicine ? "Edit Medicine" : "Add Medicine"}
          </h3>
        </div>
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto"
          id="medicine-form"
        >
          <input
            type="text"
            name="name"
            placeholder="Medicine name"
            value={medicineForm.name}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="text"
            name="title"
            placeholder="Medicine Title"
            value={medicineForm.title}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
          <textarea
            name="description"
            placeholder="Description"
            value={medicineForm.description || ""}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            rows={3}
          />
          <div className="flex gap-4">
            <input
              type="number"
              name="price"
              placeholder="Price"
              value={medicineForm.price || ""}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              step="0.01"
              min="0"
              required
            />
            <input
              type="number"
              name="original_price"
              placeholder="Original Price (Optional)"
              value={medicineForm.original_price ?? ""}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              step="0.01"
              min="0"
            />
          </div>
          <select
            name="category_id"
            value={medicineForm.category_id || ""}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select a Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div>
            <label className="block text-sm font-medium">
              Available In Pharmacies
            </label>
            <div className="border p-2 rounded max-h-40 overflow-y-auto space-y-1">
              {allPharmacies.map((pharmacy) => (
                <div key={pharmacy.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`pharmacy-${pharmacy.id}`}
                    checked={
                      medicineForm.pharmacies?.some(
                        (p) => p.id === pharmacy.id
                      ) || false
                    }
                    onChange={(e) =>
                      handlePharmacySelectionChange(
                        pharmacy,
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`pharmacy-${pharmacy.id}`}
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {pharmacy.name}
                  </label>
                </div>
              ))}
              {allPharmacies.length === 0 && (
                <p className="text-sm text-gray-500">
                  No pharmacies available. Add pharmacies first.
                </p>
              )}
            </div>

            {medicineForm.pharmacies && medicineForm.pharmacies.length > 0 && (
              <div className="mt-4 p-3 border rounded-lg space-y-4 bg-gray-50">
                <h4 className="font-semibold text-md text-gray-800">
                  Configure Pharmacy Details
                </h4>
                {medicineForm.pharmacies.map((selectedPharmacy) => {
                  const fullPharmacy = allPharmacies.find((p) => p.id === selectedPharmacy.id);
                  if (!fullPharmacy) return null;

                  const hasInsurances =
                    fullPharmacy.accepted_insurances &&
                    fullPharmacy.accepted_insurances.length > 0;

                  const hasLocations =
                    fullPharmacy.locations && fullPharmacy.locations.length > 0;

                  if (!hasInsurances && !hasLocations) {
                    return (
                      <div key={selectedPharmacy.id} className="pt-2 border-t">
                        <p className="font-medium">{selectedPharmacy.name}</p>
                        <p className="text-sm text-gray-500">
                          No configurable details for this pharmacy.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={selectedPharmacy.id} className="pt-2 border-t">
                      <p className="font-medium mb-2">{selectedPharmacy.name}</p>

                      {/* Insurances */}
                      {hasInsurances && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            Covered Insurances:
                          </p>
                          <div className="space-y-1 pl-4">
                            {fullPharmacy.accepted_insurances!.map((insuranceName) => (
                              <div key={insuranceName} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`med-pharm-${selectedPharmacy.id}-ins-${insuranceName.replace(/\s+/g, "-")}`}
                                  checked={
                                    selectedPharmacy.insurances?.includes(insuranceName) || false
                                  }
                                  onChange={(e) =>
                                    handleMedicinePharmacyInsuranceChange(
                                      selectedPharmacy.id,
                                      insuranceName,
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label
                                  htmlFor={`med-pharm-${selectedPharmacy.id}-ins-${insuranceName.replace(/\s+/g, "-")}`}
                                  className="ml-2 block text-sm text-gray-900"
                                >
                                  {insuranceName}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Locations */}
                      {hasLocations && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            Available Locations:
                          </p>
                          <div className="space-y-1 pl-4">
                            {fullPharmacy.locations!.map((loc) => (
                              <div key={loc.name} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`med-pharm-${selectedPharmacy.id}-loc-${loc.name.replace(/\s+/g, "-")}`}
                                  checked={
                                    selectedPharmacy.locations?.includes(loc.name) || false
                                  }
                                  onChange={(e) =>
                                    handleMedicinePharmacyLocationChange(
                                      selectedPharmacy.id,
                                      loc.name,
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label
                                  htmlFor={`med-pharm-${selectedPharmacy.id}-loc-${loc.name.replace(/\s+/g, "-")}`}
                                  className="ml-2 block text-sm text-gray-900"
                                >
                                  {loc.name}{" "}
                                  <span className="text-xs text-gray-500">
                                    ({loc.openingTime} - {loc.closingTime}){" "}
                                    {loc.isOpen ? "🟢" : "🔴"}
                                  </span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
          <div>
            <label className="block text-sm font-medium">Medicine Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="w-full border p-2 rounded"
            />
            {isUploading && (
              <p className="text-sm text-blue-600">Uploading...</p>
            )}
          </div>
          {medicineForm.image && (
            <img
              src={medicineForm.image}
              alt="Preview"
              className="w-full h-auto rounded border"
            />
          )}
        </form>
        <div className="p-6 border-t flex justify-end items-center gap-2">
          {formError && (
            <p className="text-red-500 text-sm mr-auto">{formError}</p>
          )}
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
            form="medicine-form"
            className="px-4 py-2 bg-indigo-600 text-white rounded"
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
