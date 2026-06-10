import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSong } from "@/lib/hooks/useSongs";
import { SongDetailView } from "@/features/songs/SongDetailView";
import { ProjectionControls } from "@/features/console/ProjectionControls";
import { clearProjection, projectSection, useProjectionState } from "@/lib/projection/channel";
import { deleteSong } from "@/lib/db/songs";

export function ConsoleSongDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const song = useSong(id);
  const state = useProjectionState();

  if (id && song === undefined) {
    return <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">…</div>;
  }
  if (!song) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
        {t("songs.noSelection")}
      </div>
    );
  }

  const liveIndex =
    state.kind === "song" && state.songId === song.id ? state.sectionIndex : undefined;

  const handleDelete = async () => {
    if (!window.confirm(t("songs.actions.confirmDelete", { title: song.title }))) return;
    if (state.kind === "song" && state.songId === song.id) clearProjection();
    await deleteSong(song.id);
    navigate("/console/songs");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ProjectionControls song={song} />
      <div className="flex items-center justify-end gap-2 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <Link
          to={`/console/songs/${song.id}/edit`}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          {t("songs.actions.edit")}
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          {t("songs.actions.delete")}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <SongDetailView
          song={song}
          currentSectionIndex={liveIndex}
          onSelectSection={(idx) => projectSection(song.id, idx)}
        />
      </div>
    </div>
  );
}
