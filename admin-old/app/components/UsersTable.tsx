"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  fullname: string;
  whatsapp_number: string;
  country: string;
  gender: string;
  role: string;
  secret_answer: string;
  is_verified: boolean;
  wallet_balance: number;
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
            <span className="text-base font-medium text-gray-800">
              ({searchQuery ? `${filteredUserCount} of ${totalUserCount}` : totalUserCount})
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
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-sm font-semibold text-gray-600">Full Name</th>
                <th className="p-3 text-sm font-semibold text-gray-600">WhatsApp Number</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Country</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Gender</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Secret Answer</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Wallet (BIF)</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Verified</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Role</th>
                <th className="p-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-t align-top">
                  <td className="p-3 text-sm text-gray-800">{u.fullname || "—"}</td>
                  <td className="p-3 text-sm text-gray-800">{u.whatsapp_number || "—"}</td>
                  <td className="p-3 text-sm text-gray-800">{u.country || "—"}</td>
                  <td className="p-3 text-sm text-gray-800">{u.gender || "—"}</td>
                  <td className="p-3 text-sm text-gray-800">{u.secret_answer || "—"}</td>
                  <td className="p-3 text-sm text-gray-800">
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
                  <td className="p-3 text-sm text-gray-800">
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
                  <td className="p-3 text-sm text-gray-800">
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
                  <td className="p-3 space-x-2 whitespace-nowrap">
                    {editingUserId === u.id ? (
                      <>
                        <button onClick={() => handleUpdate(u.id)} disabled={isSubmitting} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm disabled:bg-green-300">Save</button>
                        <button onClick={handleCancelClick} disabled={isSubmitting} className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm disabled:bg-gray-300">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEditClick(u)} disabled={isSubmitting} className="px-3 py-1 text-blue-600 hover:underline text-sm disabled:text-gray-400 disabled:cursor-not-allowed">Edit</button>
                        <button onClick={() => handleDelete(u.id)} disabled={isSubmitting} className="px-3 py-1 text-red-600 hover:underline text-sm disabled:text-gray-400 disabled:cursor-not-allowed">
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500" role="status">
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
