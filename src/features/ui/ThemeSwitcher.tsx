import { useTranslation } from "react-i18next";
import { setThemeMode, useThemeMode, type ThemeMode } from "@/lib/ui/theme";

const MODES: ThemeMode[] = ["light", "system", "dark"];

const ICONS: Record<ThemeMode, string> = {
  light: "☀",
  system: "◐",
  dark: "☾",
};

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const current = useThemeMode();

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className="inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {MODES.map((mode) => {
        const isActive = current === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setThemeMode(mode)}
            aria-pressed={isActive}
            title={t(`theme.${mode}`)}
            className={
              isActive
                ? "rounded px-2 py-0.5 text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }
          >
            {ICONS[mode]}
          </button>
        );
      })}
    </div>
  );
}
