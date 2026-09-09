import { useContext, useCallback } from 'react';
import { I18nContext } from '@/context/I18nContext';

// Helper to access nested properties of an object using a string path
const get = (obj: any, path: string, defaultValue: string = ''): string => {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        result = result?.[key];
        if (result === undefined) {
            return defaultValue;
        }
    }
    return result || defaultValue;
};


export const useTranslation = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }

    const { language, setLanguage, translations } = context;

    const t = useCallback((key: string, options?: { defaultValue?: string, [key: string]: string | number }): string => {
        const defaultValue = options?.defaultValue ?? key;
        let translation = get(translations, key, defaultValue);

        if (options) {
            Object.keys(options).forEach(optKey => {
                if (optKey === 'defaultValue') return;
                const valueToReplace = options[optKey];
                if (valueToReplace !== undefined) {
                    translation = translation.replace(`{{${optKey}}}`, String(valueToReplace));
                }
            });
        }
        return translation;
    }, [translations]);

    return { t, language, setLanguage };
};