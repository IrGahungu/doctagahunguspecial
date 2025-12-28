"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!whatsappNumber || !password) {
      alert("Please fill in all fields");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      console.log("Attempting to log in with:", { whatsapp_number: whatsappNumber, password });
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: whatsappNumber, password }),
      });

      console.log("API Response Status:", res.status, res.statusText);

      setLoading(false);

      if (res.ok) {
        console.log("Login successful, redirecting to dashboard...");
        // Perform a hard navigation to ensure the new cookie is sent to the server
        window.location.assign("/admin/dashboard");
      } else {
        const data = await res.json();
        console.error("Login failed. API response:", data);
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setLoading(false);
      setError("Something went wrong. Please try again later.");
    }
  }

  return (
    
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        padding: 20
      }}>
        <h1 style={{ textAlign: "center", marginBottom: 40 }}>
          WELCOME ONBOARD M.SC. I.T JEAN KEVIN GAHUNGU
        </h1>
        <form
          onSubmit={submit}
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: 400,
            gap: 16
          }}
        >
          <input
            placeholder="WhatsApp Number"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            style={{ padding: 10, fontSize: 16 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 10, fontSize: 16 }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 12,
              fontSize: 16,
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        {error && (
          <p style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>{error}</p>
        )}
        </form>
      </div>
    
  );
}
