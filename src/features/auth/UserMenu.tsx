import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession, signOut } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { LoginDialog } from "./LoginDialog";

export function UserMenu() {
  const { t } = useTranslation();
  const { session, loading } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isSupabaseConfigured()) return null;
  if (loading) return null;

  if (!session) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {t("auth.signIn")}
        </button>
        <LoginDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </>
    );
  }

  const email = session.user.email ?? "";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden truncate text-zinc-600 sm:inline dark:text-zinc-400" title={email}>
        {email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {t("auth.signOut")}
      </button>
    </div>
  );
}
