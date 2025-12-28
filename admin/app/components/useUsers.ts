"use client";

import { useState, useEffect, useCallback } from "react";

export type User = {
  id: string;
  fullName: string;
  whatsappNumber: string;
  country: string;
  gender: string;
  role: string;
};

async function parseApiError(res: Response, defaultMessage: string): Promise<string> {
  try {
    const errorData = await res.json();
    return errorData.error || errorData.message || res.statusText;
  } catch (e) {
    return res.statusText || defaultMessage;
  }
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const errorMessage = await parseApiError(res, "Failed to fetch users");
        console.error("Failed to fetch users:", errorMessage);
        setError(`Failed to load users: ${errorMessage}. Please ensure you are logged in as an administrator.`);
        setUsers([]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const deleteUser = async (id: string) => {
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
        return true;
      }
      const errorMessage = await parseApiError(res, "Failed to delete user");
      setError(errorMessage);
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred while deleting.";
      setError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: updatedUser.role } : u))
        );
        return true;
      }
      const errorMessage = await parseApiError(res, "Failed to update role");
      setError(errorMessage);
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred while updating.";
      setError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { users, loading, error, isSubmitting, deleteUser, updateUserRole, setError };
}