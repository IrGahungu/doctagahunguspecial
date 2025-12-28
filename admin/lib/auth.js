import jwt from "jsonwebtoken";
import cookie from "cookie";

const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function getTokenFromRequest(req) {
  // App Router (NextRequest)
  if ("cookies" in req) {
    return req.cookies.get("token")?.value || null;
  }

  // Pages Router (Node.js req)
  const header = req.headers?.cookie || "";
  const parsed = cookie.parse(header);
  return parsed.token || null;
}
