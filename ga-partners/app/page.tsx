"use client";

import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  return (
    <main className="min-h-screen w-full relative">
      {/* Full-screen Background Image */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-10" 
        style={{ 
          backgroundImage: "url('/assets/labo.jpg')",
          backgroundColor: "#f8fafc" 
        }}
      />

      {/* Semi-transparent Overlay and Content */}
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full text-center py-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            Dr. Gahungu's Partner Portal
          </h1>
          <p className="text-white mt-3 max-w-2xl mx-auto font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            Apply to join as a Doctor, Pharmacy, Hospital or Insurance provider.
          </p>

          <PartnerLinks loadingHref={loadingHref} setLoadingHref={setLoadingHref} />

          <div className="relative mt-12 max-w-sm mx-auto">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-300" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 py-1 rounded-full text-sm font-bold text-slate-700 border border-slate-200">OR</span>
            </div>
          </div>

          {/* Login button */}
          <div className="mt-8">
            {(() => {
              const href = "/login";
              const isAnyLoading = loadingHref !== null;
              const isThisLoading = loadingHref === href;
              const isDisabled = isAnyLoading && !isThisLoading;

              return (
                <Link
                  href={href}
                  onClick={(e) => {
                    if (isAnyLoading) {
                      e.preventDefault();
                    } else {
                      setLoadingHref(href);
                    }
                  }}
                  className={`inline-flex items-center justify-center px-10 py-3 rounded-lg text-white text-lg font-medium bg-green-700 transition-colors duration-300 shadow-lg ${isThisLoading ? 'opacity-75 cursor-wait' : 'hover:bg-green-800 hover:scale-[1.02]'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isThisLoading ? <Spinner /> : "Login"}
                </Link>
              );
            })()}
          </div>
        </div>
      </div>
    </main>
  );
}

function PartnerLinks({ loadingHref, setLoadingHref }: { loadingHref: string | null; setLoadingHref: (href: string | null) => void; }) {
  const links = [
    { href: "/apply/doctor", text: "Apply as Doctor", className: "bg-blue-600 hover:bg-blue-500" },
    { href: "/apply/pharmacy", text: "Apply as Pharmacy", className: "bg-green-600 hover:bg-green-500" },
    { href: "/apply/hospital", text: "Apply as Hospital", className: "bg-orange-600 hover:bg-orange-500" },
    { href: "/apply/insurance", text: "Apply as Insurance", className: "bg-purple-600 hover:bg-purple-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10 max-w-2xl mx-auto">
      {links.map(({ href, text, className }) => {
        const isAnyLoading = loadingHref !== null;
        const isThisLoading = loadingHref === href;
        const isDisabled = isAnyLoading && !isThisLoading;

        return (
          <Link
            key={href}
            href={href}
            onClick={(e) => {
              if (isAnyLoading) {
                e.preventDefault(); // Prevent navigation if a link is already loading
              } else {
                setLoadingHref(href);
              }
            }}
            className={`flex items-center justify-center p-6 rounded-xl shadow-lg font-semibold text-white transition-all duration-300 ${className} ${isThisLoading ? 'opacity-75 cursor-wait' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.03]'}`}
          >
            {isThisLoading ? (
              <Spinner />
            ) : (
              text
            )}
          </Link>
        );
      })}
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
