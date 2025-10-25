import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from './locales/en.json';
import translationAM from './locales/am.json';
import translationTI from './locales/ti.json';
import translationOM from './locales/om.json';

const resources = {
  en: {
    translation: translationEN
  },
  am: {
    translation: translationAM
  },
  ti: {
    translation: translationTI
  },
  om: {
    translation: translationOM
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;

