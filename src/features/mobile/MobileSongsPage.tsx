import { useTranslation } from "react-i18next";
import { SongListPanel } from "@/features/songs/SongListPanel";
import { LanguageSwitcher } from "@/features/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/features/ui/ThemeSwitcher";

export function MobileSongsPage() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-base font-medium">{t("nav.songs")}</h1>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <SongListPanel basePath="/m/songs" />
      </div>
    </div>
  );
}
