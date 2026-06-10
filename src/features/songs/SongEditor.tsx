import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Song, SongSection, SongSectionKind, Visibility } from "@/lib/db/schema";
import type { SongDraft } from "@/lib/db/songs";

interface Props {
  initial?: Song;
  onSubmit: (draft: SongDraft) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

interface SectionDraft {
  kind: SongSectionKind;
  label: string;
  lines: string;
}

const SECTION_KINDS: SongSectionKind[] = ["verse", "chorus", "bridge", "intro", "outro", "free"];
const LANGUAGES = ["mg", "fr", "en"] as const;
const VISIBILITIES: Visibility[] = ["private", "shared"];

function toDraftSection(s: SongSection): SectionDraft {
  return {
    kind: s.kind,
    label: s.label ?? "",
    lines: s.lines.join("\n"),
  };
}

function emptySection(): SectionDraft {
  return { kind: "verse", label: "", lines: "" };
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function SongEditor({ initial, onSubmit, onCancel, submitLabel }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [sequence, setSequence] = useState<string>(
    initial?.sequence !== null && initial?.sequence !== undefined
      ? String(initial.sequence)
      : "",
  );
  const [language, setLanguage] = useState<string>(initial?.language ?? "mg");
  const [author, setAuthor] = useState<string>(initial?.author ?? "");
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "private");
  const [sections, setSections] = useState<SectionDraft[]>(
    initial?.sections.length ? initial.sections.map(toDraftSection) : [emptySection()],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSection = (i: number, patch: Partial<SectionDraft>) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(t("songs.editor.errors.titleRequired"));
      return;
    }
    const cleanedSections: SongSection[] = sections
      .map((s) => ({
        kind: s.kind,
        label: s.label.trim() || undefined,
        lines: s.lines
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      }))
      .filter((s) => s.lines.length > 0);

    const parsedSequence = sequence.trim() ? Number.parseInt(sequence, 10) : null;
    const draft: SongDraft = {
      title,
      sequence: Number.isFinite(parsedSequence as number) ? (parsedSequence as number) : null,
      sections: cleanedSections,
      author,
      language,
      visibility,
    };

    setSubmitting(true);
    try {
      await onSubmit(draft);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-1 gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4 md:grid-cols-[1fr_120px_140px] dark:border-zinc-800 dark:bg-zinc-900">
        <LabeledInput
          label={t("songs.editor.fields.title")}
          value={title}
          onChange={setTitle}
          autoFocus
          required
        />
        <LabeledInput
          label={t("songs.editor.fields.sequence")}
          value={sequence}
          onChange={setSequence}
          type="number"
        />
        <LabeledSelect
          label={t("songs.editor.fields.language")}
          value={language}
          onChange={setLanguage}
          options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() }))}
        />
        <LabeledInput
          label={t("songs.editor.fields.author")}
          value={author}
          onChange={setAuthor}
        />
        <LabeledSelect
          label={t("songs.editor.fields.visibility")}
          value={visibility}
          onChange={(v) => setVisibility(v as Visibility)}
          options={VISIBILITIES.map((v) => ({
            value: v,
            label: t(`songs.editor.visibility.${v}`),
          }))}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("songs.editor.sections.title")}
          </h3>
          <button
            type="button"
            onClick={() => setSections((p) => [...p, emptySection()])}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            + {t("songs.editor.sections.addSection")}
          </button>
        </div>

        <ul className="space-y-3">
          {sections.map((section, i) => (
            <li
              key={i}
              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <select
                  value={section.kind}
                  onChange={(e) =>
                    updateSection(i, { kind: e.target.value as SongSectionKind })
                  }
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {SECTION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`songs.section.${k}`)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={section.label}
                  onChange={(e) => updateSection(i, { label: e.target.value })}
                  placeholder={t("songs.editor.sections.labelPlaceholder")}
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div className="flex items-center gap-1">
                  <SmallButton
                    onClick={() => setSections((p) => move(p, i, i - 1))}
                    disabled={i === 0}
                    title="↑"
                  >
                    ↑
                  </SmallButton>
                  <SmallButton
                    onClick={() => setSections((p) => move(p, i, i + 1))}
                    disabled={i === sections.length - 1}
                    title="↓"
                  >
                    ↓
                  </SmallButton>
                  <SmallButton
                    onClick={() => setSections((p) => p.filter((_, idx) => idx !== i))}
                    disabled={sections.length <= 1}
                    title={t("songs.actions.delete")}
                  >
                    ✕
                  </SmallButton>
                </div>
              </div>
              <textarea
                value={section.lines}
                onChange={(e) => updateSection(i, { lines: e.target.value })}
                placeholder={t("songs.editor.sections.linesPlaceholder")}
                rows={Math.max(3, section.lines.split("\n").length + 1)}
                className="block w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        {error && (
          <p className="flex-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {t("songs.actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Petits primitives de formulaire — locaux à ce fichier car spécifiques à ce
// formulaire. Si on en a besoin ailleurs, on les promeut dans features/ui/.
// -----------------------------------------------------------------------------

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoFocus?: boolean;
}

function LabeledInput({ label, value, onChange, type = "text", required, autoFocus }: LabeledInputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500"
      />
    </label>
  );
}

interface LabeledSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function LabeledSelect({ label, value, onChange, options }: LabeledSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SmallButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: string;
}

function SmallButton({ onClick, disabled, title, children }: SmallButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}
