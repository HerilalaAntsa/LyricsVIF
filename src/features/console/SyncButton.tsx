import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { pullFromSupabase } from "@/lib/supabase/sync";
import { useSession } from "@/lib/auth/session";

const STORAGE_KEY = "fihirana:last-sync-at";

type SyncStatus = "idle" | "running" | "ok" | "err";

function readLastSync(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLastSync(): void {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    /* mémoire seulement */
  }
}

function formatTimeAgo(iso: string | null, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function SyncButton() {
  const { t, i18n } = useTranslation();
  const { session } = useSession();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(readLastSync());

  if (!isSupabaseConfigured()) return null;
  if (!session) return null;

  const handle = async () => {
    setStatus("running");
    setError(null);
    try {
      const result = await pullFromSupabase();
      if (result) {
        writeLastSync();
        setLastSync(readLastSync());
      }
      setStatus("ok");
    } catch (err) {
      setStatus("err");
      setError((err as Error).message);
    }
  };

  const label =
    status === "running" ? "…" : status === "err" ? "!" : t("sync.button");
  const timeAgo = formatTimeAgo(lastSync, i18n.language);

  return (
    <div className="flex items-center gap-2 text-xs">
      {timeAgo && (
        <span className="hidden text-zinc-500 sm:inline dark:text-zinc-400" title={lastSync ?? ""}>
          {t("sync.lastAt", { time: timeAgo })}
        </span>
      )}
      <button
        type="button"
        onClick={() => void handle()}
        disabled={status === "running"}
        title={error ?? t("sync.button")}
        className={
          "rounded-md border px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40 dark:hover:bg-zinc-800 " +
          (status === "err"
            ? "border-red-300 bg-white text-red-700 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400"
            : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300")
        }
      >
        ⇅ {label}
      </button>
    </div>
  );
}
