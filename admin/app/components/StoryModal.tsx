"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Story = {
  id?: string;
  name: string;
  avatar: string;
  images: string[];
  tag: string;
  website?: string;
  show_tag?: boolean;
  show_website?: boolean;
};

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStory?: Story | null;
}

export default function StoryModal({
  isOpen,
  onClose,
  onSuccess,
  editingStory,
}: StoryModalProps) {
  /* ---------------- STATE ---------------- */

  const [formData, setFormData] = useState({
    name: "",
    avatar: "",
    images: "",
    tag: "",
    website: "",
    show_tag: true,
    show_website: true,
  });

  const [avatarStatus, setAvatarStatus] = useState<
    "idle" | "uploading" | "uploaded"
  >("idle");

  const [mediaStatus, setMediaStatus] = useState<
    "idle" | "uploading" | "uploaded"
  >("idle");

  const [saving, setSaving] = useState(false);

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    console.log("Editing story changed:", editingStory);

    if (editingStory) {
      setFormData({
        name: editingStory.name || "",
        avatar: editingStory.avatar || "",
        images: editingStory.images?.join(", ") || "",
        tag: editingStory.tag || "",
        website: editingStory.website || "",
        show_tag: editingStory.show_tag ?? true,
        show_website: editingStory.show_website ?? true,
      });
      setAvatarStatus(editingStory.avatar ? "uploaded" : "idle");
      setMediaStatus(editingStory.images ? "uploaded" : "idle");
    } else {
      setFormData({
        name: "",
        avatar: "",
        images: "",
        tag: "",
        website: "",
        show_tag: true,
        show_website: true,
      });
      setAvatarStatus("idle");
      setMediaStatus("idle");
    }
  }, [editingStory, isOpen]);

  /* ---------------- FILE UPLOAD ---------------- */

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Avatar upload started");

    setAvatarStatus("uploading");

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("bucket", "story-images");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setFormData((prev) => ({
        ...prev,
        avatar: result.url || result.publicUrl,
      }));

      setAvatarStatus("uploaded");
      toast.success("Avatar uploaded");
      console.log("Avatar upload completed");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Avatar upload failed");
      setAvatarStatus("idle");
    }
  };

  const handleMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log(`Media upload started for ${files.length} files`);
    setMediaStatus("uploading");

    const newUrls: string[] = [];
    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("bucket", "story-images");

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Upload failed");

        newUrls.push(result.url || result.publicUrl);
      } catch (err) {
        console.error(`Media upload error for ${file.name}:`, err);
        hasError = true;
      }
    }

    if (newUrls.length > 0) {
      setFormData((prev) => ({
        ...prev,
        images: prev.images ? `${prev.images}, ${newUrls.join(", ")}` : newUrls.join(", "),
      }));
      setMediaStatus("uploaded");
      toast.success(`${newUrls.length} media file(s) uploaded`);
    }

    if (hasError) {
      toast.error("Some uploads failed");
      if (newUrls.length === 0) setMediaStatus("idle");
    }
  };

  /* ---------------- SAVE ---------------- */

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (avatarStatus === "uploading" || mediaStatus === "uploading") {
    toast.error("Please wait for uploads to finish");
    return;
  }

  console.log("Saving story:", formData);

  const payload = {
    ...formData,
    images: formData.images
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };

  try {
    setSaving(true);

    // ✅ Put ID in URL, NOT in body
    const url = editingStory
      ? `/api/stories?id=${editingStory.id}`
      : "/api/stories";

    const method = editingStory ? "PUT" : "POST";

    console.log("Request:", { method, url, payload });

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Response:", data);

    if (!res.ok) throw new Error(data.error || "Failed to save story");

    onSuccess();
    toast.success("Story added");
    onClose();
  } catch (err) {
    console.error("Save error:", err);
    toast.error("Failed to save story");
  } finally {
    setSaving(false);
  }
};

  /* ---------------- UI ---------------- */


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
      setMediaStatus("idle");
    }
  };

  if (!isOpen) return null;

  /* ---------------- UI ---------------- */

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-xl flex flex-col max-h-[90vh] shadow-xl border" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {editingStory ? "Edit Story" : "Add Story"}
          </h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600 cursor-pointer">
            &times;
          </button>
        </div>

        <form id="story-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* NAME */}
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            placeholder="Name"
            value={formData.name ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            className="w-full border p-2 rounded"
          />

          {/* AVATAR */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Avatar Upload
            </label>

            <input 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarUpload} 
              className="w-full border p-2 rounded bg-gray-50 cursor-pointer text-sm"
            />

            {formData.avatar && (
              <div className="flex items-center gap-3 mt-2">
                <img
                  src={formData.avatar}
                  alt="Avatar preview"
                  className="w-16 h-16 object-cover rounded-full border"
                />

                {avatarStatus === "uploading" && (
                  <span className="text-yellow-600 text-sm">
                    Uploading...
                  </span>
                )}

                {avatarStatus === "uploaded" && (
                  <span className="text-green-600 text-sm">
                    Uploaded
                  </span>
                )}
              </div>
            )}
          </div>

          {/* MEDIA */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Media Upload
            </label>

            <input 
              type="file" 
              accept="image/*,video/*" 
              multiple
              onChange={handleMediaUpload} 
              className="w-full border p-2 rounded bg-gray-50 cursor-pointer text-sm"
            />

            {mediaArray.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3 items-center">
                {mediaArray.map((url, i) => {
                  const isVideo = url.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                  return (
                    <div key={i} className="relative group">
                      {isVideo ? (
                        <video
                          src={url}
                          className="w-24 h-24 object-cover rounded border"
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`Media preview ${i}`}
                          className="w-24 h-24 object-cover rounded border"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}

                {mediaStatus === "uploading" && (
                  <span className="text-yellow-600 text-sm">
                    Uploading...
                  </span>
                )}

                {mediaStatus === "uploaded" && (
                  <span className="text-green-600 text-sm">
                    Uploaded
                  </span>
                )}
              </div>
            )}
          </div>

          {/* TAG */}
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Tag</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show on App</span>
              <input
                type="checkbox"
                checked={formData.show_tag}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    show_tag: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Tag"
            value={formData.tag ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                tag: e.target.value,
              }))
            }
            className="w-full border p-2 rounded"
          />

          {/* WEBSITE */}
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Website</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show Button on App</span>
              <input
                type="checkbox"
                checked={formData.show_website}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    show_website: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Website"
            value={formData.website ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                website: e.target.value,
              }))
            }
            className="w-full border p-2 rounded"
          />
        </form>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="story-form"
            disabled={
              saving ||
              avatarStatus === "uploading" ||
              mediaStatus === "uploading"
            }
            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : editingStory ? "Update Story" : "Save Story"}
          </button>
        </div>
      </div>
    </div>
  );
}