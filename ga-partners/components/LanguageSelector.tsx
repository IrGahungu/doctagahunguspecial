"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' }
  ];

  const currentLabel = languages.find(l => l.code === lang)?.label;

  return (
    <div className="absolute top-6 right-6 z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/90 backdrop-blur-md text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg border-2 border-green-500 hover:bg-white transition-all cursor-pointer outline-none"
      >
        <span>{currentLabel}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div 
        className={`absolute right-0 mt-2 w-32 bg-white rounded-2xl shadow-xl border-2 border-green-500 overflow-hidden transition-all duration-200 origin-top-right ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => {
              setLang(l.code as any);
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors cursor-pointer ${
              lang === l.code 
                ? 'bg-green-50 text-green-700' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}