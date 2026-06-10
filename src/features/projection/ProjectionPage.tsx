import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSong } from "@/lib/hooks/useSongs";
import { useProjectionState } from "@/lib/projection/channel";

export function ProjectionPage() {
  const { t } = useTranslation();
  const state = useProjectionState();

  useEffect(() => {
    document.title = "FihiranaVIF — Projection";
  }, []);

  if (state.kind === "blackout") {
    return <div className="h-full w-full bg-black" aria-label="blackout" />;
  }

  if (state.kind === "idle") {
    return (
      <div className="flex h-full items-center justify-center bg-projection-bg text-projection-muted">
        <p className="text-xl font-projection tracking-tight">{t("app.name")}</p>
      </div>
    );
  }

  return <SongProjection songId={state.songId} sectionIndex={state.sectionIndex} />;
}

interface SongProjectionProps {
  songId: string;
  sectionIndex: number;
}

function SongProjection({ songId, sectionIndex }: SongProjectionProps) {
  const song = useSong(songId);

  if (!song) {
    return (
      <div className="flex h-full items-center justify-center bg-projection-bg text-projection-muted">
        <p className="text-xl">…</p>
      </div>
    );
  }

  const total = song.sections.length;
  const safeIndex = Math.max(0, Math.min(sectionIndex, total - 1));
  const section = song.sections[safeIndex];
  const reference = song.sequence !== null ? `#${song.sequence}` : "";
  const positionLabel = total > 0 ? `${safeIndex + 1} / ${total}` : "";
  const progress = total > 0 ? ((safeIndex + 1) / total) * 100 : 0;

  return (
    <div className="flex h-full flex-col bg-projection-bg font-projection text-projection-fg">
      <div className="flex items-start justify-between px-8 py-6 text-sm text-projection-muted">
        <span className="truncate">{song.title}</span>
        <span>{positionLabel}</span>
      </div>
      <div className="flex flex-1 items-center justify-center px-12 text-center">
        {section ? (
          <div className="max-w-6xl space-y-6">
            {section.lines.map((line, i) => (
              <p
                key={i}
                className="text-4xl font-light leading-tight tracking-tight md:text-6xl lg:text-7xl"
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-2xl text-projection-muted">—</p>
        )}
      </div>
      <div className="space-y-2 px-8 py-6 text-sm text-projection-muted">
        <div className="flex justify-between">
          <span>{reference}</span>
          <span>{song.author ?? ""}</span>
        </div>
        <div className="h-0.5 w-full bg-projection-muted/20">
          <div
            className="h-0.5 bg-projection-muted/70 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
