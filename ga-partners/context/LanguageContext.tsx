"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, partnerTranslations, PartnerTranslations } from '../app/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: PartnerTranslations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const storedLang = localStorage.getItem('partner_portal_language') as Language;
    if (storedLang === 'en' || storedLang === 'fr') {
      setLangState(storedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('partner_portal_language', newLang);
  };

  const t = partnerTranslations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}