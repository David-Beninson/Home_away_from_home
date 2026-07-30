import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'he'],
    ns: ['common', 'guest', 'host', 'admin'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already safe from XSS
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    parseMissingKeyHandler: (key) => {
      console.warn(`[i18n] Missing translation for key: "${key}"`);
      // You can return a default string here, or just the key itself
      return key;
    },
  });

export default i18n;
