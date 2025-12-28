import { getTokenFromRequest, verifyToken } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { id } = req.query;

  // Prevent an admin from deleting or demoting themselves
  if (id === payload.userId) {
    return res.status(400).json({ error: "Admin cannot modify their own account through this endpoint." });
  }

  // Handle role update (e.g., make another user an admin)
  if (req.method === "PUT") {
    const { role } = req.body;
    if (role !== "admin") {
      return res.status(400).json({ error: "Invalid role specified. Only 'admin' is supported for promotion." });
    }

    const { error } = await supabaseAdmin.from("users").update({ role }).eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: "User role updated successfully." });
  }

  // Handle user deletion
  if (req.method === "DELETE") {
    // Note: Supabase Admin client bypasses RLS.
    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: "User deleted successfully." });
  }

  // If method is not PUT or DELETE
  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}