import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Song } from "@/lib/db/schema";
import {
  blackoutProjection,
  clearProjection,
  projectSection,
  projectSong,
  useProjectionState,
} from "@/lib/projection/channel";

interface Props {
  song: Song;
}

export function ProjectionControls({ song }: Props) {
  const { t } = useTranslation();
  const state = useProjectionState();
  const isLive = state.kind === "song" && state.songId === song.id;
  const total = song.sections.length;
  const liveIndex = isLive ? state.sectionIndex : -1;
  const nextIndex = isLive && liveIndex + 1 < total ? liveIndex + 1 : null;
  const prevIndex = isLive && liveIndex > 0 ? liveIndex - 1 : null;

  useEffect(() => {
    if (!isLive) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        if (nextIndex !== null) projectSection(song.id, nextIndex);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if (prevIndex !== null) projectSection(song.id, prevIndex);
      } else if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        blackoutProjection();
      } else if (e.key === "Escape") {
        e.preventDefault();
        clearProjection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLive, song.id, nextIndex, prevIndex]);

  const openProjectionWindow = () => {
    window.open("/projection", "fihirana-projection", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      {!isLive ? (
        <button
          type="button"
          onClick={() => projectSong(song.id)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {t("songs.actions.openProjection")}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => prevIndex !== null && projectSection(song.id, prevIndex)}
            disabled={prevIndex === null}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            ← {t("songs.actions.previous")}
          </button>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {liveIndex + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => nextIndex !== null && projectSection(song.id, nextIndex)}
            disabled={nextIndex === null}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {t("songs.actions.next")} →
          </button>
          <button
            type="button"
            onClick={blackoutProjection}
            className="ml-auto rounded-md border border-zinc-300 bg-white px-3 py-1.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {t("songs.actions.blackout")}
          </button>
          <button
            type="button"
            onClick={clearProjection}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="stop"
          >
            ■
          </button>
        </>
      )}
      <button
        type="button"
        onClick={openProjectionWindow}
        className="ml-auto rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        title="/projection"
      >
        ↗
      </button>
    </div>
  );
}
