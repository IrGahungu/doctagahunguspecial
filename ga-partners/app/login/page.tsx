"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { useLanguage } from "../../context/LanguageContext";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const endpoint = `/api/${role}/login`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        toast.success(t.loginSuccess || "Logged in");
        router.push(`/${role}/dashboard`);
      } else {
        // Handle the failure manually instead of throwing to avoid triggering Next.js error overlays
        toast.error(t.wrongCredentials || "Wrong Credentials");
      }
    } catch (err: any) {
      // This only catches network-level failures (like being offline)
      toast.error(t.wrongCredentials || "Wrong Credentials");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-8 md:py-12 px-4 md:px-0">
      <Toaster position="top-center" reverseOrder={false} />
      <h2 className="text-2xl font-bold mb-8 text-center">{t.welcomeLogin}</h2>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-center font-semibold text-gray-700 mb-4">{t.chooseRole}</p>
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ease-in-out min-w-[120px] h-24 hover:bg-gray-50 hover:shadow-md ${
            role === "doctor" ? "bg-green-50 border-green-600 ring-2 ring-green-500 shadow-lg" : "border-gray-300"
          }`}>
            {role === "doctor" && (
              <div className="absolute top-2 right-2 animate-fadeIn">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <input
              type="radio"
              name="role"
              value="doctor"
              checked={role === "doctor"}
              onChange={(e) => setRole(e.target.value)}
              className="sr-only"
            />
            <svg className={`h-8 w-8 mb-1 transition-colors ${role === "doctor" ? "text-green-600" : "text-gray-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
              <path d="M12 11v4" />
              <path d="M10 13h4" />
            </svg>
            <span className={`font-medium mt-2 ${role === "doctor" ? "text-green-700" : "text-gray-700"}`}>{t.doctor}</span>
          </label>
          <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ease-in-out min-w-[120px] h-24 hover:bg-gray-50 hover:shadow-md ${
            role === "pharmacy" ? "bg-green-50 border-green-600 ring-2 ring-green-500 shadow-lg" : "border-gray-300"
          }`}>
            {role === "pharmacy" && (
              <div className="absolute top-2 right-2 animate-fadeIn">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <input
              type="radio"
              name="role"
              value="pharmacy"
              checked={role === "pharmacy"}
              onChange={(e) => setRole(e.target.value)}
              className="sr-only"
            />
            <svg className={`h-8 w-8 mb-1 transition-colors ${role === "pharmacy" ? "text-green-600" : "text-gray-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
              <path d="m8.5 8.5 7 7" />
            </svg>
            <span className={`font-medium mt-2 ${role === "pharmacy" ? "text-green-700" : "text-gray-700"}`}>{t.pharmacy}</span>
          </label>
          <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ease-in-out min-w-[120px] h-24 hover:bg-gray-50 hover:shadow-md ${
            role === "insurance" ? "bg-green-50 border-green-600 ring-2 ring-green-500 shadow-lg" : "border-gray-300"
          }`}>
            {role === "insurance" && (
              <div className="absolute top-2 right-2 animate-fadeIn">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <input
              type="radio"
              name="role"
              value="insurance"
              checked={role === "insurance"}
              onChange={(e) => setRole(e.target.value)}
              className="sr-only"
            />
            <svg className={`h-8 w-8 mb-1 transition-colors ${role === "insurance" ? "text-green-600" : "text-gray-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className={`font-medium mt-2 ${role === "insurance" ? "text-green-700" : "text-gray-700"}`}>{t.insurance}</span>
          </label>
          <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ease-in-out min-w-[120px] h-24 hover:bg-gray-50 hover:shadow-md ${
            role === "hospital" ? "bg-green-50 border-green-600 ring-2 ring-green-500 shadow-lg" : "border-gray-300"
          }`}>
            {role === "hospital" && (
              <div className="absolute top-2 right-2 animate-fadeIn">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <input
              type="radio"
              name="role"
              value="hospital"
              checked={role === "hospital"}
              onChange={(e) => setRole(e.target.value)}
              className="sr-only"
            />
            <svg className={`h-8 w-8 mb-1 transition-colors ${role === "hospital" ? "text-green-600" : "text-gray-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
              <path d="M9 12h6" />
              <path d="M12 9v6" />
            </svg>
            <span className={`font-medium mt-2 ${role === "hospital" ? "text-green-700" : "text-gray-700"}`}>{t.hospital}</span>
          </label>
        </div>

        {role && (
          <div key={role} className="space-y-4 animate-fadeIn">
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fadeIn {
                animation: fadeIn 0.4s ease-out forwards;
              }
            `}</style>
            <input required type="email" placeholder={t.email} value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-2.5 md:p-3 border rounded-lg text-sm md:text-base"/>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} placeholder={t.password} value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-2.5 md:p-3 border rounded-lg pr-10 md:pr-12 text-sm md:text-base"/>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-2.5 md:px-3 flex items-center text-xs md:text-sm text-gray-600"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639l4.43-4.43a1.012 1.012 0 011.43 0l4.43 4.43a1.012 1.012 0 010 .639l-4.43 4.43a1.012 1.012 0 01-1.43 0l-4.43-4.43z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">{t.forgotPassword}</Link>
            </div>
            <button type="submit" className="w-full p-2.5 md:p-3 bg-green-600 text-white rounded-lg flex justify-center items-center font-medium md:font-semibold" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : t.login}
            </button>
          </div>
        )}
      </form>
      <div className="mt-6">
        <Link href="/" className="w-full flex justify-center items-center p-2.5 md:p-3 border-2 border-gray-200 text-gray-600 rounded-lg bg-blue-300 hover:border-gray-300 transition-all font-medium text-sm md:text-base">
          {t.back}
        </Link>
      </div>
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
