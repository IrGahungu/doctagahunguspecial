"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Post = {
  id: string;
  title: string;
  tag?: string;
  avatar: string;
  images: string[];
  caption: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  twitter?: string;
  show_website?: boolean;
  show_whatsapp?: boolean;
  show_instagram?: boolean;
  show_twitter?: boolean;
};

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPost: Post | null;
  onSuccess: () => void;
}

export default function PostModal({
  isOpen,
  onClose,
  editingPost,
  onSuccess,
}: PostModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    tag: "",
    avatar: "",
    images: "",
    caption: "",
    website: "",
    whatsapp: "",
    instagram: "",
    twitter: "",
    show_website: true,
    show_whatsapp: true,
    show_instagram: true,
    show_twitter: true,
  });

  const [saving, setSaving] = useState(false);

  // Separate upload states (IMPORTANT)
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [avatarUploaded, setAvatarUploaded] = useState(false);
  const [mediaUploaded, setMediaUploaded] = useState(false);

  useEffect(() => {
    console.log("[PostModal] editingPost changed:", editingPost);

    if (editingPost) {
      setFormData({
        title: editingPost.title || "",
        tag: editingPost.tag || "",
        avatar: editingPost.avatar || "",
        images: editingPost.images?.join(", ") || "",
        caption: editingPost.caption || "",
        website: editingPost.website || "",
        whatsapp: editingPost.whatsapp || "",
        instagram: editingPost.instagram || "",
        twitter: editingPost.twitter || "",
        show_website: editingPost.show_website ?? true,
        show_whatsapp: editingPost.show_whatsapp ?? true,
        show_instagram: editingPost.show_instagram ?? true,
        show_twitter: editingPost.show_twitter ?? true,
      });
    } else {
      setFormData({
        title: "",
        tag: "",
        avatar: "",
        images: "",
        caption: "",
        website: "",
        whatsapp: "",
        instagram: "",
        twitter: "",
        show_website: true,
        show_whatsapp: true,
        show_instagram: true,
        show_twitter: true,
      });
    }

    setAvatarUploaded(false);
    setMediaUploaded(false);
  }, [editingPost, isOpen]);

  if (!isOpen) return null;

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "avatar" | "images"
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log(`[PostModal] Uploading ${field}: ${files.length} file(s)`);

    if (field === "avatar") {
      setAvatarUploading(true);
      setAvatarUploaded(false);
    } else {
      setMediaUploading(true);
      setMediaUploaded(false);
    }

    try {
      const newUrls: string[] = [];
      let hasError = false;

      // Avatar is single, images can be multiple
      const limit = field === "avatar" ? 1 : files.length;

      for (let i = 0; i < limit; i++) {
        const file = files[i];
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("bucket", "post-images");

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            body: uploadFormData,
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.error);

          newUrls.push(result.url || result.publicUrl);
        } catch (err) {
          console.error(`[PostModal] Upload error for ${file.name}:`, err);
          hasError = true;
        }
      }

      if (newUrls.length > 0) {
        if (field === "avatar") {
          setFormData((prev) => ({ ...prev, avatar: newUrls[0] }));
          setAvatarUploaded(true);
        } else {
          setFormData((prev) => ({
            ...prev,
            images: prev.images ? `${prev.images}, ${newUrls.join(", ")}` : newUrls.join(", "),
          }));
          setMediaUploaded(true);
        }
      }

      if (hasError) {
        toast.error("Some uploads failed");
      }
    } finally {
      if (field === "avatar") setAvatarUploading(false);
      else setMediaUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("[PostModal] Submitting:", formData);

    setSaving(true);

    const payload = {
      ...formData,
      images: formData.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const url = editingPost
        ? `/api/posts?id=${editingPost.id}`
        : "/api/posts";

      const method = editingPost ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save post");

      console.log("[PostModal] Save successful");
      onSuccess();
      toast.success("Post added");
      onClose();
    } catch (err) {
      console.error("[PostModal] Save error:", err);
      toast.error("Error saving post");
    } finally {
      setSaving(false);
    }
  }

  const mediaArray = formData.images
    ? formData.images.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const handleRemoveMedia = (indexToRemove: number) => {
    const updatedArray = mediaArray.filter((_, i) => i !== indexToRemove);
    setFormData((prev) => ({
      ...prev,
      images: updatedArray.join(", "),
    }));
    if (updatedArray.length === 0) {
      setMediaUploaded(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {editingPost ? "Edit Post" : "Add New Post"}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <form
          id="post-form"
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {/* TITLE + TAG */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                required
                placeholder="Title"
                className="w-full border p-2 rounded"
                value={formData.title}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tag</label>
              <input
                type="text"
                placeholder="Tag"
                className="w-full border p-2 rounded"
                value={formData.tag}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, tag: e.target.value }))
                }
              />
            </div>
          </div>

          {/* AVATAR */}
          <div>
            <label className="block text-sm font-medium mb-1">Avatar Upload</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, "avatar")}
              className="w-full border p-2 rounded bg-gray-50 cursor-pointer text-sm"
            />

            {formData.avatar && (
              <div className="flex items-center gap-3 mt-2">
                <img
                  src={formData.avatar}
                  className="w-16 h-16 rounded-full object-cover border"
                />
                <span className="text-green-600 text-sm">
                  {avatarUploading
                    ? "Uploading..."
                    : avatarUploaded
                    ? "Uploaded"
                    : "Ready"}
                </span>
              </div>
            )}
          </div>

          {/* MEDIA */}
          <div>
            <label className="block text-sm font-medium mb-1">Media Upload</label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleFileUpload(e, "images")}
              className="w-full border p-2 rounded bg-gray-50 cursor-pointer text-sm"
            />

            {mediaArray.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3">
                {mediaArray.map((url, i) => {
                  const isVideo = url.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                  return (
                    <div key={i} className="relative group">
                      {isVideo ? (
                        <video
                          src={url}
                          className="w-20 h-20 object-cover rounded border"
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`Media preview ${i}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                        title="Remove"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}
                <span className="text-green-600 text-sm">
                  {mediaUploading
                    ? "Uploading..."
                    : mediaUploaded
                    ? "Uploaded"
                    : "Ready"}
                </span>
              </div>
            )}
          </div>

          {/* CAPTION */}
          <label className="block text-sm font-medium">Caption</label>
          <textarea
            required
            placeholder="Caption"
            rows={3}
            className="border p-2 rounded w-full"
            value={formData.caption}
            onChange={(e) =>
              setFormData((p) => ({ ...p, caption: e.target.value }))
            }
          />

          {/* SOCIALS */}
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Website</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show on App</span>
              <input
                type="checkbox"
                checked={formData.show_website}
                onChange={(e) => setFormData(p => ({ ...p, show_website: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Website"
            className="border p-2 rounded w-full mb-2"
            value={formData.website}
            onChange={(e) =>
              setFormData((p) => ({ ...p, website: e.target.value }))
            }
          />

          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">WhatsApp</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show on App</span>
              <input
                type="checkbox"
                checked={formData.show_whatsapp}
                onChange={(e) => setFormData(p => ({ ...p, show_whatsapp: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="WhatsApp (e.g. 257xxxxxx)"
            className="border p-2 rounded w-full mb-2"
            value={formData.whatsapp}
            onChange={(e) =>
              setFormData((p) => ({ ...p, whatsapp: e.target.value }))
            }
          />

          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Instagram</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show on App</span>
              <input
                type="checkbox"
                checked={formData.show_instagram}
                onChange={(e) => setFormData(p => ({ ...p, show_instagram: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Instagram URL"
            className="border p-2 rounded w-full mb-2"
            value={formData.instagram}
            onChange={(e) =>
              setFormData((p) => ({ ...p, instagram: e.target.value }))
            }
          />

          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">X (Twitter)</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show on App</span>
              <input
                type="checkbox"
                checked={formData.show_twitter}
                onChange={(e) => setFormData(p => ({ ...p, show_twitter: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="X URL"
            className="border p-2 rounded w-full"
            value={formData.twitter}
            onChange={(e) =>
              setFormData((p) => ({ ...p, twitter: e.target.value }))
            }
          />
        </form>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="post-form"
            disabled={saving || avatarUploading || mediaUploading}
            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : editingPost ? "Update Post" : "Save Post"}
          </button>
        </div>
      </div>
    </div>
  );
}