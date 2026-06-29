import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession, signOut } from "@/lib/auth/session";
import { LoginDialog } from "@/features/auth/LoginDialog";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface Props {
  onExport?: () => void;
}

function initials(email: string | undefined): string {
  if (!email) return "?";
  const [local] = email.split("@");
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function HeaderMenu({ onExport }: Props) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const email = session?.user.email;
  const supabaseOn = isSupabaseConfigured();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {email ? initials(email) : "·"}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {email ? (
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{t("auth.signedInAs")}</p>
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100" title={email}>
                {email}
              </p>
            </div>
          ) : supabaseOn ? (
            <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setLoginOpen(true);
                }}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {t("auth.signIn")}
              </button>
            </div>
          ) : null}

          {onExport && (
            <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  onExport();
                  setOpen(false);
                }}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ⬇ {t("songs.actions.export")}
              </button>
            </div>
          )}

          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("theme.label")}
            </p>
            <ThemeSwitcher />
          </div>

          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("language.label")}
            </p>
            <LanguageSwitcher />
          </div>

          {email && (
            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t("auth.signOut")}
              </button>
            </div>
          )}
        </div>
      )}

      {supabaseOn && <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />}
    </div>
  );
}
