"use client";

import { useEffect, useState } from "react";

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
  const [visibleQuestions, setVisibleQuestions] = useState<Set<string>>(new Set());
  const [visibleAnswers, setVisibleAnswers] = useState<Set<string>>(new Set());

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
        const data = await res.json();
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
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setUsers([]); // Also reset on network errors.
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } else {
        let errorMessage = "Failed to delete user";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) { /* Ignore */ }
        console.error("Failed to delete user:", errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while deleting.");
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
        const updatedUser = await res.json();
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, role: updatedUser.role, wallet_balance: updatedUser.wallet_balance }
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
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Users Overview</h2>
          {!loading && totalUserCount > 0 && (
            <span className="px-3 py-1 text-sm font-bold text-white bg-blue-500 rounded-full">
              {searchQuery ? `${filteredUserCount}/${totalUserCount}` : totalUserCount}
            </span>
          )}
        </div>
        <div className="w-full max-w-xs">
          <input
            type="text"
            placeholder="Search by name or WhatsApp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-white rounded-lg shadow overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="w-full text-left min-w-[640px] border-collapse border border-gray-200">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-sm font-semibold text-gray-600 whitespace-nowrap border border-gray-200">Full Name</th>
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
                <tr key={u.id} className="align-top">
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{u.fullname || "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{u.whatsapp_number || "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{u.country || "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">{u.gender || "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200 whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    <div className="flex items-center justify-between gap-2 min-w-[120px]">
                      <span>{visibleQuestions.has(u.id) ? (u.secret_question || "—") : "********"}</span>
                      <button 
                        onClick={() => toggleQuestionVisibility(u.id)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 focus:outline-none"
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
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 focus:outline-none"
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
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 focus:outline-none"
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
                  <td className="p-3 text-sm text-gray-800 border border-gray-200 font-bold text-green-600">
                    {(u.engagement_points || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-sm text-gray-800 border border-gray-200">
                    <button
                      onClick={() => handleToggleVerified(u.id, u.is_verified)}
                      disabled={isSubmitting || editingUserId === u.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                          <button onClick={() => handleUpdate(u.id)} disabled={isSubmitting} className="btn-save">Save</button>
                          <button onClick={handleCancelClick} disabled={isSubmitting} className="btn-cancel">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(u)} disabled={isSubmitting} className="btn-edit">Edit</button>
                          <button onClick={() => handleDelete(u.id)} disabled={isSubmitting} className="btn-delete">
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
                  <td colSpan={13} className="p-6 text-center text-gray-500" role="status">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
