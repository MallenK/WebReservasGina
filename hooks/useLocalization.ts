import { useState, useEffect, useCallback } from 'react';

type Translations = { [key: string]: string };
type Language = 'es' | 'ca';

const cachedTranslations: { [key in Language]?: Translations } = {};

export const useLocalization = () => {
  const [language, setLanguage] = useState<Language>('es');
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTranslations = async () => {
      setLoading(true);
      
      // Use cache if available
      if (cachedTranslations[language]) {
        setTranslations(cachedTranslations[language]!);
        setLoading(false);
        return;
      }

      try {
        // Using a relative path from the root, which is more stable.
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load translation file for ${language}`);
        }
        const data = await response.json();
        cachedTranslations[language] = data; // Cache the translations
        setTranslations(data);
      } catch (error) {
        console.error("Failed to load translations:", error);
        setTranslations({}); // Fallback to empty
      } finally {
        setLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
    if (loading) return key; // Return key itself as a fallback during load
    let translation = translations[key] || key;
    if (options) {
      Object.keys(options).forEach(optionKey => {
        const regex = new RegExp(`{{${optionKey}}}`, 'g');
        translation = translation.replace(regex, String(options[optionKey]));
      });
    }
    return translation;
  }, [translations, loading]);

  return { language, setLanguage, t };
};
