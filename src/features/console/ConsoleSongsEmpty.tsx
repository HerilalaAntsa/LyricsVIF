import { useTranslation } from "react-i18next";

export function ConsoleSongsEmpty() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
      {t("songs.noSelection")}
    </div>
  );
}
