"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Login failed");

      toast.success("Logged in");
      // redirect to dashboard
      router.push("/doctor/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h2 className="text-2xl font-bold mb-8 text-center">Dr. Gahungu Welcomes you, Please Login.</h2>
      <form onSubmit={submit} className="space-y-4">
        <input required type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-3 border rounded-lg"/>
        <div className="relative">
          <input required type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-3 border rounded-lg"/>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-gray-600"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <button type="submit" className="w-full p-3 bg-green-600 text-white rounded-lg flex justify-center items-center" disabled={busy}>
          {busy ? (
            <Spinner />
          ) : "Login"}
        </button>
      </form>
      <p className="text-center mt-4">
        <Link href="/" className="text-blue-600 underline">Go to homepage</Link>
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-6 w-6 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
