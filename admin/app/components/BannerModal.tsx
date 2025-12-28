"use client";

import { useState, useEffect } from "react";

type Banner = {
  id: string;
  image: string;
  link: string;
};

type BannerForm = {
  image: string;
  link: string;
};

type BannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingBanner: Banner | null;
  onSuccess: () => void;
};

export default function BannerModal({
  isOpen,
  onClose,
  editingBanner,
  onSuccess,
}: BannerModalProps) {
  const [bannerForm, setBannerForm] = useState<BannerForm>({
    image: "",
    link: "#",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingBanner) {
        setBannerForm({
          image: editingBanner.image || "",
          link: editingBanner.link || "#",
        });
      } else {
        setBannerForm({ image: "", link: "#" });
      }
      setFormError(null);
    }
  }, [editingBanner, isOpen]);

  if (!isOpen) return null;

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setBannerForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "banner-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setBannerForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred during upload.";
      setFormError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!bannerForm.image) {
      setFormError("Please upload an image before saving!");
      setIsSubmitting(false);
      return;
    }

    try {
      const url = "/api/banners";
      const method = editingBanner ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingBanner
            ? { ...bannerForm, id: editingBanner.id }
            : bannerForm
        ),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save Banner");

      onSuccess();
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to save banner");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b shrink-0">
          <h3 className="text-lg font-semibold">{editingBanner ? "Edit Banner" : "Add Banner"}</h3>
        </div>
        <form id="banner-form" onSubmit={handleBannerSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700">Banner Image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border p-2 rounded" disabled={isUploading} />
            {isUploading && <p className="text-sm text-blue-600">Uploading...</p>}
          </div>
          {bannerForm.image && <img src={bannerForm.image} alt="Preview" className="w-full h-auto object-contain rounded border" />}
          
          <input type="text" name="link" placeholder="Link URL (e.g., /products/123)" value={bannerForm.link} onChange={handleBannerChange} className="w-full border p-2 rounded" />
        </form>
        <div className="p-6 border-t shrink-0">
          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50" disabled={isSubmitting || isUploading}>Cancel</button>
            <button type="submit" form="banner-form" className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-400" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}