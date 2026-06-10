import { Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useActiveChurch } from "@/lib/hooks/useActiveChurch";
import { downloadBlob, exportSongsAsBlob } from "@/lib/db/songs";
import { SongListPanel } from "@/features/songs/SongListPanel";
import { LanguageSwitcher } from "@/features/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/features/ui/ThemeSwitcher";
import { UserMenu } from "@/features/auth/UserMenu";
import { SyncButton } from "@/features/console/SyncButton";

export function ConsoleSongsPage() {
  const { t } = useTranslation();
  const params = useParams<{ id?: string }>();
  const church = useActiveChurch();

  const handleExport = async () => {
    const blob = await exportSongsAsBlob(church?.id);
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `fihirana-${church?.slug ?? "songs"}-${date}.json`);
  };

  return (
    <div className="flex h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("console.title")}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("console.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title={t("songs.actions.export")}
          >
            ⬇ {t("songs.actions.export")}
          </button>
          <ThemeSwitcher />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr]">
        <aside className="min-h-0 border-r border-zinc-200 dark:border-zinc-800">
          <SongListPanel
            basePath="/console/songs"
            selectedId={params.id}
            newPath="/console/songs/new"
          />
        </aside>
        <main className="min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
