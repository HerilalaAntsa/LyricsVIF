/**
 * Session auth Supabase.
 *
 * Si Supabase n'est pas configuré (env vide), `session = null` en permanence
 * et les wrappers signIn/signOut deviennent no-op + throw explicite. Permet
 * à toute l'UI de garder le même code (UserMenu, SyncButton…) sans planter
 * quand le backend est absent — principe local-first.
 */

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

interface UseSessionResult {
  session: Session | null;
  loading: boolean;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase non configuré — renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
