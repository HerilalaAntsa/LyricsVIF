import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SongEditor } from "@/features/songs/SongEditor";
import { useSong } from "@/lib/hooks/useSongs";
import { updateSong } from "@/lib/db/songs";

export function ConsoleSongEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const song = useSong(id);

  if (song === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        …
      </div>
    );
  }
  if (!song) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        {t("songs.noSelection")}
      </div>
    );
  }

  return (
    <SongEditor
      initial={song}
      onSubmit={async (draft) => {
        await updateSong(song.id, draft);
        navigate(`/console/songs/${song.id}`);
      }}
      onCancel={() => navigate(`/console/songs/${song.id}`)}
      submitLabel={t("songs.actions.save")}
    />
  );
}
