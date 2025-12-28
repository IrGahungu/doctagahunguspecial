"use client";

import { useState, useEffect } from "react";

type Deal = {
  id: string;
  title: string;
  discount: string;
  image: string;
  tagline: string;
};

type DealForm = {
  title: string;
  discount: string;
  image: string;
  tagline: string;
};

type DealModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingDeal: Deal | null;
  onSuccess: () => void;
};

export default function DealModal({
  isOpen,
  onClose,
  editingDeal,
  onSuccess,
}: DealModalProps) {
  const [dealForm, setDealForm] = useState<DealForm>({
    title: "",
    discount: "",
    image: "",
    tagline: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingDeal) {
        setDealForm({
          title: editingDeal.title || "",
          discount: editingDeal.discount || "",
          image: editingDeal.image || "",
          tagline: editingDeal.tagline || "",
        });
      } else {
        setDealForm({ title: "", discount: "", image: "", tagline: "" });
      }
      setFormError(null);
    }
  }, [editingDeal, isOpen]);

  if (!isOpen) return null;

  function handleDealChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setDealForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "deal-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setDealForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred during upload.";
      setFormError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDealSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!dealForm.image) {
      setFormError("Please upload an image before saving!");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = "/api/deals";
      const method = editingDeal ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingDeal ? { ...dealForm, id: editingDeal.id } : dealForm
        ),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save Deal");

      onSuccess();
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to save deal");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b shrink-0">
          <h3 className="text-lg font-semibold">{editingDeal ? "Edit Deal" : "Add Deal"}</h3>
        </div>
        <form id="deal-form" onSubmit={handleDealSubmit} className="p-6 space-y-4 overflow-y-auto">
          <input type="text" name="title" placeholder="Deal Title" value={dealForm.title} onChange={handleDealChange} className="w-full border p-2 rounded" />
          <input type="text" name="discount" placeholder="Discount Text (e.g., Up to 30% Off)" value={dealForm.discount} onChange={handleDealChange} className="w-full border p-2 rounded" />
          <input type="text" name="tagline" placeholder="Tagline" value={dealForm.tagline} onChange={handleDealChange} className="w-full border p-2 rounded" />
          <div>
            <label className="block text-sm font-medium text-gray-700">Deal Image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 rounded" disabled={isUploading} />
            {isUploading && <p className="text-sm text-blue-600">Uploading...</p>}
          </div>
          {dealForm.image && <img src={dealForm.image} alt="Preview" className="w-full h-auto object-contain rounded border" />}
        </form>
        <div className="p-6 border-t shrink-0">
          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50" disabled={isSubmitting || isUploading}>Cancel</button>
            <button type="submit" form="deal-form" className="px-4 py-2 bg-orange-600 text-white rounded disabled:bg-gray-400" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}