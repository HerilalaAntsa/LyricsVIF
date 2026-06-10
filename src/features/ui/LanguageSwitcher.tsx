import { useTranslation } from "react-i18next";
import { setUiLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

interface Props {
  variant?: "compact" | "labelled";
}

const LABELS: Record<SupportedLanguage, string> = {
  fr: "FR",
  en: "EN",
};

export function LanguageSwitcher({ variant = "compact" }: Props) {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language) as SupportedLanguage;

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className="inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {variant === "labelled" && (
        <span className="px-1.5 text-xs text-zinc-500 dark:text-zinc-400">{t("language.label")}</span>
      )}
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = current === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setUiLanguage(lang)}
            aria-pressed={isActive}
            className={
              isActive
                ? "rounded px-2 py-0.5 text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }
          >
            {LABELS[lang]}
          </button>
        );
      })}
    </div>
  );
}
