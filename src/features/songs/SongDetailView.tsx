import { useTranslation } from "react-i18next";
import type { Song, SongSection, SongSectionKind } from "@/lib/db/schema";

interface Props {
  song: Song;
  currentSectionIndex?: number;
  onSelectSection?: (index: number) => void;
}

const KIND_BG: Record<SongSectionKind, string> = {
  verse: "bg-white dark:bg-zinc-900",
  chorus: "bg-amber-50 dark:bg-amber-950/40",
  bridge: "bg-sky-50 dark:bg-sky-950/40",
  intro: "bg-zinc-50 dark:bg-zinc-900/60",
  outro: "bg-zinc-50 dark:bg-zinc-900/60",
  free: "bg-white dark:bg-zinc-900",
};

export function SongDetailView({ song, currentSectionIndex, onSelectSection }: Props) {
  const { t } = useTranslation();
  const selectable = typeof onSelectSection === "function";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-baseline gap-3">
          {song.sequence !== null && (
            <span className="font-mono text-sm text-zinc-400 dark:text-zinc-500">
              #{song.sequence.toString().padStart(3, "0")}
            </span>
          )}
          <h2 className="text-2xl font-semibold tracking-tight">{song.title}</h2>
        </div>
        {song.author && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{song.author}</p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {song.sections.length === 0 ? (
          <p className="text-sm italic text-zinc-400 dark:text-zinc-500">—</p>
        ) : (
          <ol className="space-y-3">
            {song.sections.map((section, idx) => (
              <SectionCard
                key={idx}
                section={section}
                index={idx}
                isCurrent={idx === currentSectionIndex}
                selectable={selectable}
                onSelect={() => onSelectSection?.(idx)}
                label={t(`songs.section.${section.kind}`)}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

interface SectionCardProps {
  section: SongSection;
  index: number;
  isCurrent: boolean;
  selectable: boolean;
  label: string;
  onSelect: () => void;
}

function SectionCard({ section, index, isCurrent, selectable, label, onSelect }: SectionCardProps) {
  const baseClass = `rounded-lg border p-4 ${KIND_BG[section.kind]}`;
  const cursor = selectable ? "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500" : "";
  const ring = isCurrent
    ? "border-zinc-900 ring-2 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
    : "border-zinc-200 dark:border-zinc-700";
  const content = (
    <>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <span className="font-mono">{(index + 1).toString().padStart(2, "0")}</span>
        <span>{section.label ?? label}</span>
      </div>
      <div className="space-y-0.5 text-base leading-relaxed">
        {section.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </>
  );
  if (!selectable) {
    return <li className={`${baseClass} ${ring}`}>{content}</li>;
  }
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`block w-full text-left ${baseClass} ${ring} ${cursor}`}
      >
        {content}
      </button>
    </li>
  );
}
