"use client";

import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "./LanguageSelector";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen w-full relative">
      <LanguageSelector />
      {/* Background Image */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-10" 
        style={{ 
          backgroundImage: "url('/assets/labo.jpg')",
          backgroundColor: "#f8fafc" 
        }}
      />

      {/* Semi-transparent Overlay and Content */}
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full text-center py-12 bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-4 drop-shadow-sm">
              {t.title}
            </h1>
            <p className="text-lg md:text-xl font-bold text-slate-800 max-w-2xl mx-auto drop-shadow-sm">
              {t.subtitle}
            </p>
          </div>

          <div className="flex flex-col items-center gap-8">
            {/* Primary Login Button */}
            <Link 
              href="/login"
              className="w-full max-w-xs py-4 px-8 bg-green-700 text-white rounded-2xl font-black text-xl shadow-xl hover:bg-green-800 hover:scale-105 transition-all flex items-center justify-center gap-3 border-b-4 border-green-900 active:border-b-0 active:translate-y-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {t.login}
            </Link>

            <div className="flex items-center gap-4 w-full max-w-xs">
              <div className="h-px bg-slate-300 flex-1"></div>
              <span className="text-slate-500 font-black text-sm">{t.or}</span>
              <div className="h-px bg-slate-300 flex-1"></div>
            </div>

            {/* Apply Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              <Link 
                href="/apply/doctor"
                className="p-4 bg-white/90 hover:bg-white text-slate-900 rounded-xl font-bold border-2 border-slate-200 hover:border-green-600 hover:text-green-700 transition-all shadow-md text-center"
              >
                {t.applyDoctor}
              </Link>
              <Link 
                href="/apply/pharmacy"
                className="p-4 bg-white/90 hover:bg-white text-slate-900 rounded-xl font-bold border-2 border-slate-200 hover:border-green-600 hover:text-green-700 transition-all shadow-md text-center"
              >
                {t.applyPharmacy}
              </Link>
              <Link 
                href="/apply/hospital"
                className="p-4 bg-white/90 hover:bg-white text-slate-900 rounded-xl font-bold border-2 border-slate-200 hover:border-green-600 hover:text-green-700 transition-all shadow-md text-center"
              >
                {t.applyHospital}
              </Link>
              <Link 
                href="/apply/insurance"
                className="p-4 bg-white/90 hover:bg-white text-slate-900 rounded-xl font-bold border-2 border-slate-200 hover:border-green-600 hover:text-green-700 transition-all shadow-md text-center"
              >
                {t.applyInsurance}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
