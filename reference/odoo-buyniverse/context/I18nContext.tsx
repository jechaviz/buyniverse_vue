import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import es from '@/i18n/es';
import en from '@/i18n/en';

type Language = 'es' | 'en';

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    translations: any;
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translationsData = { es, en };

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        const storedLang = localStorage.getItem('app-lang');
        return (storedLang === 'en' || storedLang === 'es') ? storedLang : 'es';
    });

    useEffect(() => {
        localStorage.setItem('app-lang', language);
    }, [language]);

    const value = useMemo(() => ({
        language,
        setLanguage,
        translations: translationsData[language],
    }), [language]);

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
};