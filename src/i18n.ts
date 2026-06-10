import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/lib/i18n/locales/en.json";
import fr from "@/lib/i18n/locales/fr.json";

export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "fihirana:ui-lang";
const DEFAULT_LANGUAGE: SupportedLanguage = "fr";

function readStoredLanguage(): SupportedLanguage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (SUPPORTED_LANGUAGES as readonly string[]).includes(raw)) {
      return raw as SupportedLanguage;
    }
  } catch {
    // localStorage indispo (mode privé) → on retombe sur le défaut
  }
  return DEFAULT_LANGUAGE;
}

const initialLang = readStoredLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: initialLang,
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

document.documentElement.lang = initialLang;

export function setUiLanguage(lang: SupportedLanguage): void {
  if (i18n.language === lang) return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // idem : on continue en mémoire
  }
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export default i18n;
