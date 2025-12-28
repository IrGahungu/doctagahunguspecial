import { getTokenFromRequest, verifyToken } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== "admin") return res.status(403).json({ error: "Admin required" });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, fullname, whatsapp_number, country, gender, role, created_at, wallet_balance, is_verified, secret_answer")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  return res.status(405).end();
}
