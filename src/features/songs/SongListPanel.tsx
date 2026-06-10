import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useActiveChurch } from "@/lib/hooks/useActiveChurch";
import { useFilteredSongs } from "@/lib/hooks/useSongs";

interface Props {
  basePath: string;
  selectedId?: string;
  newPath?: string;
}

export function SongListPanel({ basePath, selectedId, newPath }: Props) {
  const { t } = useTranslation();
  const church = useActiveChurch();
  const [query, setQuery] = useState("");
  const songs = useFilteredSongs(church?.id, query);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("songs.searchPlaceholder")}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          aria-label={t("songs.searchPlaceholder")}
        />
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{t("songs.count", { count: songs.length })}</span>
          {newPath && (
            <Link
              to={newPath}
              className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              + {t("songs.actions.new")}
            </Link>
          )}
        </div>
      </div>
      {songs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-zinc-400 dark:text-zinc-500">
          {t("songs.empty")}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {songs.map((s) => {
            const selected = selectedId === s.id;
            const itemClass = selected
              ? "bg-zinc-100 dark:bg-zinc-800"
              : "hover:bg-zinc-50 dark:hover:bg-zinc-900";
            return (
              <li key={s.id}>
                <Link
                  to={`${basePath}/${s.id}`}
                  className={`block border-b border-zinc-100 px-3 py-3 dark:border-zinc-800/60 ${itemClass}`}
                >
                  <div className="flex items-baseline gap-3">
                    {s.sequence !== null && (
                      <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                        {s.sequence.toString().padStart(3, "0")}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium">{s.title}</span>
                  </div>
                  {s.author && (
                    <div className="ml-9 truncate text-xs text-zinc-500 dark:text-zinc-400">{s.author}</div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
