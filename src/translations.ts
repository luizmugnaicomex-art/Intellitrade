// src/translations.ts
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { translations } from './translations.data';

export type TranslationKeys = keyof typeof translations.en;
type Language = 'en' | 'zh';

type TranslationContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKeys) => string;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('language', 'en');

  const t = useCallback((key: TranslationKeys): string => {
    return translations[language]?.[key] || translations['en'][key];
  }, [language]);

  return React.createElement(TranslationContext.Provider, {
    value: { language, setLanguage, t }
  }, children);
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
