"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  fullname: string;
  whatsapp_number: string;
  country: string;
  gender: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`/api/admin/users`);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) router.push("/admin/login");
          throw new Error((await res.json()).error || "Failed to fetch users");
        }
        setUsers(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [router]);

  const makeAdmin = async (id: string) => {
    if (!confirm("Make this user admin?")) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin", id }),
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || "Failed");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete user?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || "Failed");
    }
  };

  return (
    <>
      <h1>Users</h1>
      {loading && <p>Loading users...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <table className="user-table">
          <thead>
              <tr>
                  <th>Name</th>
                  <th>WhatsApp</th>
                  <th>Country</th>
                  <th>Role</th>
                  <th>Actions</th>
              </tr>
          </thead>
          <tbody>
              {users.map((u) => (
                  <tr key={u.id}>
                      <td>{u.fullname}</td>
                      <td>{u.whatsapp_number}</td>
                      <td>{u.country}</td>
                      <td>{u.role}</td>
                      <td>
                          {u.role !== "admin" && (
                              <button onClick={() => makeAdmin(u.id)}>Make Admin</button>
                          )}
                          <button
                              onClick={() => deleteUser(u.id)}
                              style={{ marginLeft: 8 }}
                          >
                              Delete
                          </button>
                      </td>
                  </tr>
              ))}
          </tbody>
        </table>
      )}<style jsx>{`
        .user-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        .user-table th,
        .user-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .user-table th {
          background-color: #f4f4f4;
          font-weight: bold;
        }
        .user-table tr:nth-child(even) {
          background-color: #fafafa;
        }
        .user-table tr:hover {
          background-color: #f1f1f1;
        }
        button {
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:first-of-type {
          background-color: #0070f3;
          color: white;
        }
        button:last-of-type {
          background-color: #e53e3e;
          color: white;
        }
      `}</style></>
    
  );
}
