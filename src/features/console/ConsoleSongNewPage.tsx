import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SongEditor } from "@/features/songs/SongEditor";
import { useActiveChurch } from "@/lib/hooks/useActiveChurch";
import { createSong } from "@/lib/db/songs";

export function ConsoleSongNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const church = useActiveChurch();

  if (!church) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        …
      </div>
    );
  }

  return (
    <SongEditor
      onSubmit={async (draft) => {
        const song = await createSong(church.id, draft);
        navigate(`/console/songs/${song.id}`);
      }}
      onCancel={() => navigate("/console/songs")}
      submitLabel={t("songs.actions.create")}
    />
  );
}
