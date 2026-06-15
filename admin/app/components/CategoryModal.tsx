"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

type Category = {
  id: string;
  name: string;
  image?: string;
};

type CategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  onSuccess: () => void;
};

export default function CategoryModal({
  isOpen,
  onClose,
  editingCategory,
  onSuccess,
}: CategoryModalProps) {
  const [categoryForm, setCategoryForm] = useState({ name: "", image: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setCategoryForm({ name: editingCategory.name, image: editingCategory.image || "" });
      } else {
        setCategoryForm({ name: "", image: "" });
      }
      setFormError(null);
    }
  }, [editingCategory, isOpen]);

  if (!isOpen) return null;

  function handleCategoryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setCategoryForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "category-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        const msg = result.error || "Upload failed";
        toast.error(msg);
        setFormError(msg);
        return;
      }

      setCategoryForm((prev) => ({ ...prev, image: result.publicUrl }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred during upload.";
      setFormError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const url = "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingCategory
            ? { ...categoryForm, id: editingCategory.id }
            : categoryForm
        ),
      });

      const result = await res.json();
      if (!res.ok) {
        const msg = result.error || "Failed to save category";
        toast.error(msg);
        setFormError(msg);
        return;
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="bg-white rounded-lg shadow-xl border border-gray-100 w-full max-w-md flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b shrink-0">
          <h3 className="text-lg font-semibold">
            {editingCategory ? "Edit Category" : "Add Category"}
          </h3>
        </div>
        <form id="category-form" onSubmit={handleCategorySubmit} className="p-6 space-y-4 overflow-y-auto">
          <input
            type="text"
            name="name"
            placeholder="Category Name"
            value={categoryForm.name}
            onChange={handleCategoryChange}
            className="w-full border p-2 rounded"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full border p-2 rounded text-sm"
              disabled={isUploading}
            />
            {isUploading && <p className="text-sm text-blue-600 mt-1">Uploading image...</p>}
          </div>
          {categoryForm.image && (
            <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded border border-dashed">
              <img src={categoryForm.image} alt="Preview" className="w-12 h-12 object-contain" />
              <p className="text-xs text-gray-500">Image Preview</p>
            </div>
          )}
        </form>
        <div className="p-6 border-t shrink-0">
          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50 cursor-pointer" disabled={isSubmitting || isUploading}>Cancel</button>
            <button type="submit" form="category-form" className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400 cursor-pointer" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
      </div>
    </div>
    </div>
  );
}