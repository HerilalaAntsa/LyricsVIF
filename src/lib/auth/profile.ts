/**
 * Récupère le profil applicatif (public.users + churches.*) après login et
 * l'upsert en local Dexie pour qu'il soit disponible en offline. Sur logout,
 * on **ne wipe pas** Dexie : les chants restent lisibles, l'app continue de
 * fonctionner en mode lecture seule.
 */

import type { Session } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import type { Church, User } from "@/lib/db/schema";
import { getSupabase } from "@/lib/supabase/client";

const STORAGE_KEY = "fihirana:current-user-id";

export function getCurrentUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setCurrentUserId(id: string | null): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* mémoire seulement */
  }
}

export async function syncProfile(session: Session): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (userErr) {
    console.warn("[auth] échec récupération profil :", userErr.message);
    return;
  }
  if (!userRow) {
    // Compte auth existe mais aucun profil applicatif (admin doit en créer un).
    console.warn("[auth] profil applicatif introuvable pour", session.user.email);
    return;
  }

  const { data: churchRow, error: chErr } = await supabase
    .from("churches")
    .select("*")
    .eq("id", userRow.church_id)
    .maybeSingle();
  if (chErr) {
    console.warn("[auth] échec récupération église :", chErr.message);
    return;
  }

  await db.transaction("rw", db.users, db.churches, async () => {
    await db.users.put(userRow as User);
    if (churchRow) await db.churches.put(churchRow as Church);
  });

  setCurrentUserId(session.user.id);
}

export function clearCurrentUser(): void {
  setCurrentUserId(null);
}
