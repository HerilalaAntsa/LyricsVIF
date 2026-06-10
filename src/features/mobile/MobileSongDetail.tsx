import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSong } from "@/lib/hooks/useSongs";
import { SongDetailView } from "@/features/songs/SongDetailView";

export function MobileSongDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const song = useSong(id);

  return (
    <div className="flex h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <Link to="/m/songs" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" aria-label="back">
          ←
        </Link>
        <span className="truncate text-base font-medium">{song?.title ?? "…"}</span>
      </header>
      <div className="min-h-0 flex-1">
        {song ? (
          <SongDetailView song={song} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
            {id ? "…" : t("songs.noSelection")}
          </div>
        )}
      </div>
    </div>
  );
}
