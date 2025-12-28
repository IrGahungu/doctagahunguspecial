"use client";

import { useState, useEffect } from "react";

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
      if (!res.ok) throw new Error(result.error || "Failed to save category");

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
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
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
          <input
            type="text"
            name="image"
            placeholder="Emoji (e.g., 🧠)"
            value={categoryForm.image}
            onChange={handleCategoryChange}
            className="w-full border p-2 rounded"
          />
        </form>
        <div className="p-6 border-t shrink-0">
          {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50" disabled={isSubmitting}>Cancel</button>
            <button type="submit" form="category-form" className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
      </div>
    </div>
    </div>
  );
}