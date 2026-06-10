/**
 * Client Supabase — singleton paresseux.
 *
 * Si les variables d'environnement ne sont pas configurées (cas du dev local
 * avant de créer le projet Supabase), `getSupabase()` retourne null. Aucune
 * partie de l'app ne doit planter à cause de l'absence du backend — c'est le
 * principe local-first du cadrage.
 *
 * Cf. .local_rag #1 : Supabase = backend choisi pour RLS multi-tenant.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!URL || !ANON_KEY) return null;
  if (!cached) {
    cached = createClient(URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "fihirana:auth",
      },
    });
  }
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON_KEY);
}
