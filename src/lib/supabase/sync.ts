/**
 * Synchronisation Supabase ↔ Dexie.
 *
 * Stratégie v1 (lecture seule depuis le serveur) :
 *   - Au lancement, si en ligne et authentifié, pull les songs (et churches)
 *     depuis Supabase et upsert dans Dexie.
 *   - L'assemblée continue de lire depuis Dexie, donc aucun blocage si la
 *     synchro échoue.
 *
 * Écritures (admin CRUD) à venir : on les fait directement sur Supabase et on
 * réinjecte la réponse dans Dexie. Mode offline : file locale + rejoue (futur).
 */

import { db } from "@/lib/db";
import type { Church, Song } from "@/lib/db/schema";
import { invalidateSongIndex } from "@/lib/search/songs";
import { getSupabase } from "./client";

interface SyncResult {
  churches: number;
  songs: number;
}

export async function pullFromSupabase(): Promise<SyncResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: churches, error: churchesErr } = await supabase
    .from("churches")
    .select("*");
  if (churchesErr) throw churchesErr;

  const { data: songs, error: songsErr } = await supabase.from("songs").select("*");
  if (songsErr) throw songsErr;

  await db.transaction("rw", db.churches, db.songs, async () => {
    if (churches) await db.churches.bulkPut(churches as Church[]);
    if (songs) await db.songs.bulkPut(songs as Song[]);
  });

  // L'index plein texte est obsolète après ingestion de nouveaux chants.
  invalidateSongIndex();

  return {
    churches: churches?.length ?? 0,
    songs: songs?.length ?? 0,
  };
}
