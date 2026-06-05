"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "react-hot-toast";

type User = {
  id: string;
  fullname: string;
  whatsapp_number: string;
  country: string;
  gender: string;
  role: string;
  secret_question: string;
  secret_answer: string;
  password?: string;
  is_verified: boolean;
  wallet_balance: number;
  created_at: string;
  engagement_points: number;
};

export default function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingWalletBalance, setEditingWalletBalance] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkUpdateRole, setBulkUpdateRole] = useState<string>("user");
  const [isBulkWalletModalOpen, setIsBulkWalletModalOpen] = useState(false);
  const [bulkWalletAmount, setBulkWalletAmount] = useState<string>("0");
  const [bulkWalletMode, setBulkWalletMode] = useState<"set" | "add" | "sub">("add");
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; type: 'delete' | 'update' } | null>(null);
  const [visibleQuestions, setVisibleQuestions] = useState<Set<string>>(new Set());
  const [visibleAnswers, setVisibleAnswers] = useState<Set<string>>(new Set());
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleQuestionVisibility = (userId: string) => {
    setVisibleQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleAnswerVisibility = (userId: string) => {
    setVisibleAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data: User[] = await res.json();
        setUsers(data);
      } else {
        let errorMessage = res.statusText;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) {
          // Ignore JSON parsing errors if the body is not JSON
        }
        console.error("Failed to fetch users:", errorMessage);
        setError(`Failed to load users: ${errorMessage}. Please ensure you are logged in as an administrator.`);
        setUsers([]); // Ensure `users` is an array to prevent runtime errors.
        setSelectedUserIds(new Set()); // Clear selections on fetch
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setUsers([]); // Also reset on network errors.
    } finally {
      setLoading(false);
    }
  }


  const handleDelete = (id: string) => {
    setConfirmModal({
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone and all their data will be permanently removed.",
      type: 'delete',
      onConfirm: () => executeDelete(id)
    });
  };

  async function executeDelete(id: string) {
    setIsSubmitting(true);
    setConfirmModal(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        toast.success("User deleted successfully");
      } else {
        toast.error("Failed to delete user");
      }
    } catch (err) {
      toast.error("An error occurred while deleting.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEditClick(user: User) {
    setEditingUserId(user.id);
    setSelectedRole(user.role);
    setEditingWalletBalance(String(user.wallet_balance || 0));
  }

  function handleCancelClick() {
    setEditingUserId(null);
    setSelectedRole("");
    setError(null);
  }

  async function handleUpdate(userId: string) {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          role: selectedRole,
          wallet_balance: parseFloat(editingWalletBalance) || 0,
        }),
      });

      if (res.ok) {
        const updatedUser: User = await res.json();
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, role: updatedUser.role, wallet_balance: Number(updatedUser.wallet_balance) }
              : u
          )
        );
        setEditingUserId(null);
      } else {
        let errorMessage = "Failed to update role";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) { /* Ignore */ }
        console.error("Failed to update role:", errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Error updating role:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while updating.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Enable drag-to-scroll horizontally to make navigation easier in the middle of the table
  useEffect(() => {
    const slider = tableContainerRef.current;
    if (!slider) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      // Avoid dragging if the user is clicking on a button, input, or toggle
      if ((e.target as HTMLElement).closest('button, input, select, label, .cursor-pointer')) return;
      isDown = true;
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const handleMouseLeave = () => { isDown = false; };
    const handleMouseUp = () => { isDown = false; };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5; 
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mouseleave', handleMouseLeave);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mousemove', handleMouseMove);

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('mouseleave', handleMouseLeave);
      slider.removeEventListener('mouseup', handleMouseUp);
      slider.removeEventListener('mousemove', handleMouseMove);
    };
  }, [loading]);

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const toggleSelect = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedUserIds(next);
  };

  async function handleBulkRoleUpdate() {
    if (selectedUserIds.size === 0) return;
    setConfirmModal({
      title: "Confirm Bulk Role Update",
      message: `Are you sure you want to update the role of ${selectedUserIds.size} users to "${bulkUpdateRole}"?`,
      type: 'update',
      onConfirm: executeBulkRoleUpdate
    });
  }

  async function executeBulkRoleUpdate() {
    setIsSubmitting(true);
    setConfirmModal(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedUserIds),
          role: bulkUpdateRole,
        }),
      });

      if (res.ok) {
        setUsers(prev =>
          prev.map(user =>
            selectedUserIds.has(user.id) ? { ...user, role: bulkUpdateRole } : user
          )
        );
        setSelectedUserIds(new Set());
        setIsBulkUpdateModalOpen(false);
        toast.success(`Successfully updated role for ${selectedUserIds.size} users.`);
      } else {
        let errorMessage = "Failed to bulk update roles";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) { /* Ignore */ }
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during bulk update.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBulkWalletUpdate() {
    if (selectedUserIds.size === 0) return;
    const amount = parseFloat(bulkWalletAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setConfirmModal({
      title: "Confirm Bulk Wallet Update",
      message: `Are you sure you want to ${bulkWalletMode === 'set' ? 'set' : bulkWalletMode === 'add' ? 'add to' : 'subtract from'} the wallet balance of ${selectedUserIds.size} users?`,
      type: 'update',
      onConfirm: executeBulkWalletUpdate
    });
  }

  async function executeBulkWalletUpdate() {
    setIsSubmitting(true);
    setConfirmModal(null);
    setError(null);
    const amount = parseFloat(bulkWalletAmount);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedUserIds),
          wallet_balance: amount,
          wallet_mode: bulkWalletMode,
        }),
      });

      if (res.ok) {
        const updatedUsers: Array<Pick<User, 'id' | 'wallet_balance'>> = await res.json();
        const balanceMap = new Map<string, number>(
          updatedUsers.map((u) => [u.id, u.wallet_balance])
        );

        setUsers(prev =>
          prev.map(user =>
            selectedUserIds.has(user.id) 
              ? { ...user, wallet_balance: Number(balanceMap.get(user.id) ?? user.wallet_balance) } 
              : user
          )
        );
        setSelectedUserIds(new Set());
        setIsBulkWalletModalOpen(false);
        toast.success(`Successfully updated wallet balance for ${selectedUserIds.size} users.`);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to bulk update wallet balance");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during bulk update.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedUserIds.size === 0) return;
    setConfirmModal({
      title: "Confirm Bulk Deletion",
      message: `Are you sure you want to delete ${selectedUserIds.size} users? This action cannot be undone and will remove all their data.`,
      type: 'delete',
      onConfirm: executeBulkDelete
    });
  }

  async function executeBulkDelete() {
    setIsSubmitting(true);
    setConfirmModal(null);
    setError(null);
    try {
      // Assuming the DELETE endpoint can handle an array of IDs
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedUserIds) }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(user => !selectedUserIds.has(user.id)));
        setSelectedUserIds(new Set());
        toast.success(`Successfully deleted ${selectedUserIds.size} users.`);
      } else {
        let errorMessage = "Failed to bulk delete users";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) { /* Ignore */ }
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during bulk delete.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleVerified(userId: string, currentStatus: boolean) {
    const newStatus = !currentStatus;
    // Optimistically update the UI
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_verified: newStatus } : u))
    );

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, is_verified: newStatus }),
      });

      if (!res.ok) {
        // Revert the optimistic update on failure
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_verified: currentStatus } : u))
        );
        let errorMessage = "Failed to update verification status";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) { /* Ignore */ }
        setError(errorMessage);
      }
    } catch (err) {
      // Revert on network error
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_verified: currentStatus } : u)));
      setError(err instanceof Error ? err.message : "An unknown error occurred while updating.");
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    (user.fullname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (user.whatsapp_number?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const totalUserCount = users.length;
  const filteredUserCount = filteredUsers.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start pt-2 px-1">
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-bold text-gray-800">Users Overview</h2>
            {!loading && totalUserCount > 0 && (
              <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">
                {searchQuery ? `${filteredUserCount}/${totalUserCount}` : totalUserCount}
              </span>
            )}
          </div>

          {selectedUserIds.size > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                {selectedUserIds.size} selected
              </span>
              <button
                onClick={() => setIsBulkUpdateModalOpen(true)}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
              >
                Bulk Update Role
              </button>
              <button
                onClick={() => setIsBulkWalletModalOpen(true)}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
              >
                Bulk Update Wallet
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
              >
                Bulk Delete
              </button>
            </div>
          )}
        </div>

        <div className="w-full max-w-xs">
          <input
            type="text"
            placeholder="Search by name or WhatsApp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading ? ( 
        <p>Loading users...</p>
      ) : (
        <div 
          ref={tableContainerRef}
          className="bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] border border-gray-200"
        >
          <table className="w-full text-left min-w-[640px] border-collapse border border-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-20">
              <tr>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200 sticky left-0 bg-gray-100 z-30">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                    checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200 sticky left-[42px] bg-gray-100 z-30 shadow-[2px_0_0_0_rgba(0,0,0,0.05)]">Full Name</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">WhatsApp Number</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Country</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Gender</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Created At</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Secret Question</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Secret Answer</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Password</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Wallet (BIF)</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">EP</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Verified</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Role</th>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                // Ensure u.id is always a string for key and Set operations
                <tr key={u.id} className="align-top">
                  <td className="p-3 text-sm text-gray-800 border border-gray-200 sticky left-0 bg-white z-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
                      checked={selectedUserIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                    />
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200 sticky left-[42px] bg-white z-10 font-medium shadow-[2px_0_0_0_rgba(0,0,0,0.05)]">{u.fullname || "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{u.whatsapp_number || "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{u.country || "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{u.gender || "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200 whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    <div className="flex items-center justify-between gap-2 min-w-[120px]">
                      <span>{visibleQuestions.has(u.id) ? (u.secret_question || "—") : "********"}</span>
                      <button 
                        onClick={() => toggleQuestionVisibility(u.id)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 focus:outline-none cursor-pointer"
                        title={visibleQuestions.has(u.id) ? "Hide question" : "Show question"}
                      >
                        {visibleQuestions.has(u.id) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    <div className="flex items-center justify-between gap-2 min-w-[120px]">
                      <span>{visibleAnswers.has(u.id) ? (u.secret_answer || "—") : "********"}</span>
                      <button 
                        onClick={() => toggleAnswerVisibility(u.id)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 focus:outline-none cursor-pointer"
                        title={visibleAnswers.has(u.id) ? "Hide answer" : "Show answer"}
                      >
                        {visibleAnswers.has(u.id) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    <div className="flex items-center justify-between gap-2 min-w-[100px]">
                      <span className="font-mono">{visiblePasswords.has(u.id) ? (u.password || "—") : "********"}</span>
                      <button 
                        onClick={() => togglePasswordVisibility(u.id)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 focus:outline-none cursor-pointer"
                        title={visiblePasswords.has(u.id) ? "Hide password" : "Show password"}
                      >
                        {visiblePasswords.has(u.id) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    {editingUserId === u.id ? (
                      <input
                        type="number"
                        value={editingWalletBalance}
                        onChange={(e) => setEditingWalletBalance(e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    ) : (
                      <span>
                        {(u.wallet_balance || 0).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm border border-gray-200 font-bold text-green-600">
                    {(u.engagement_points || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    <button
                      onClick={() => handleToggleVerified(u.id, u.is_verified)}
                      disabled={isSubmitting || editingUserId === u.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                        u.is_verified ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.is_verified ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    {editingUserId === u.id ? (
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="border p-1 rounded w-full"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {u.role || "—"}
                      </span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap border border-gray-200">
                    <div className="flex flex-col gap-2">
                      {editingUserId === u.id ? (
                        <>
                          <button onClick={() => handleUpdate(u.id)} disabled={isSubmitting} className="btn-save cursor-pointer">Save</button>
                          <button onClick={handleCancelClick} disabled={isSubmitting} className="btn-cancel cursor-pointer">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(u)} disabled={isSubmitting} className="btn-edit cursor-pointer">Edit</button>
                          <button onClick={() => handleDelete(u.id)} disabled={isSubmitting} className="btn-delete cursor-pointer">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-gray-500" role="status">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Update Modals - Inlined to prevent focus loss during typing */}
      {isBulkUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md cursor-pointer">
            <h3 className="text-lg font-bold mb-4">Bulk Update Role</h3>
            <p className="mb-4">Selected {selectedUserIds.size} users. Choose a new role:</p>
            <select
              value={bulkUpdateRole}
              onChange={(e) => setBulkUpdateRole(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsBulkUpdateModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRoleUpdate}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Updating..." : "Update Roles"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBulkWalletModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Bulk Update Wallet Balance</h3>
            <p className="mb-4 text-sm text-gray-600">Apply to {selectedUserIds.size} selected users:</p>
            
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
              {(['set', 'add', 'sub'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setBulkWalletMode(mode)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    bulkWalletMode === mode 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode === 'set' ? 'Set To' : mode === 'add' ? 'Add' : 'Subtract'}
                </button>
              ))}
            </div>

            <div className="relative mb-6">
              <input
                type="number"
                value={bulkWalletAmount}
                onChange={(e) => setBulkWalletAmount(e.target.value)}
                className={`w-full p-3 pr-24 border rounded-md focus:ring-2 outline-none font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  bulkWalletMode === 'sub' ? 'focus:ring-red-500' : 'focus:ring-blue-500'
                }`}
                placeholder="0"
                min="0"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                 {bulkWalletMode !== 'set' && (
                   <span className={`text-xl font-bold ${bulkWalletMode === 'add' ? 'text-green-500' : 'text-red-500'}`}>
                     {bulkWalletMode === 'add' ? '+' : '-'}
                   </span>
                 )}
                 <span className="text-gray-400 font-bold">BIF</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mb-6 italic">
              {bulkWalletMode === 'set' ? '* This will overwrite existing balances.' : 
               bulkWalletMode === 'add' ? '* This will be added to the current balance of each user.' : 
               '* This will be deducted from the current balance (cannot go below 0).'}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsBulkWalletModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkWalletUpdate}
                disabled={isSubmitting}
                className={`px-4 py-2 text-white rounded-md disabled:opacity-50 transition-colors text-sm font-bold cursor-pointer ${
                  bulkWalletMode === 'sub' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSubmitting ? "Updating..." : "Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-6 py-2 text-white rounded-lg transition-colors text-sm font-bold cursor-pointer shadow-lg ${
                  confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
