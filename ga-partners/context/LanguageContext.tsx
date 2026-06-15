"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { partnerTranslations, PartnerTranslations, Language } from '../app/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: PartnerTranslations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to English for initial SSR consistency
  const [lang, setLangState] = useState<Language>('en');

  // Load persisted language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('partner_language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('partner_language', newLang);
  };

  // Dynamically get the translation object based on current state
  const t = partnerTranslations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    toast.error('useLanguage must be used within a LanguageProvider');
    return {
      lang: 'en' as Language,
      setLang: () => {},
      t: partnerTranslations['en']
    };
  }
  return context;
};