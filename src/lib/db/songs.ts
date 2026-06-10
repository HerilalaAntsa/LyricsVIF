/**
 * CRUD chants côté Dexie.
 *
 * Toute mutation invalide l'index MiniSearch en cache (cf. lib/search/songs)
 * pour que la recherche reflète immédiatement les changements.
 *
 * Les écritures vivent en local pour l'instant. Quand Supabase sera câblé,
 * c'est ici qu'on plug-in l'écriture distante + reconciliation.
 */

import { db } from "./index";
import type { Song, SongSection } from "./schema";
import { invalidateSongIndex } from "@/lib/search/songs";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  // crypto.randomUUID() : Web Crypto natif (Chrome 92+, Safari 15.4+, Firefox 95+).
  // Tous nos navigateurs cibles sont OK.
  return crypto.randomUUID();
}

export interface SongDraft {
  title: string;
  sequence: number | null;
  sections: SongSection[];
  author?: string;
  language: string;
  visibility: Song["visibility"];
}

export async function createSong(churchId: string, draft: SongDraft): Promise<Song> {
  const now = nowIso();
  const song: Song = {
    id: newId(),
    church_id: churchId,
    title: draft.title.trim(),
    sequence: draft.sequence,
    sections: draft.sections,
    author: draft.author?.trim() || undefined,
    language: draft.language,
    visibility: draft.visibility,
    forked_from: null,
    created_at: now,
    updated_at: now,
  };
  await db.songs.add(song);
  invalidateSongIndex();
  return song;
}

export async function updateSong(id: string, patch: SongDraft): Promise<void> {
  const existing = await db.songs.get(id);
  if (!existing) throw new Error(`Song ${id} not found`);
  const updated: Song = {
    ...existing,
    title: patch.title.trim(),
    sequence: patch.sequence,
    sections: patch.sections,
    author: patch.author?.trim() || undefined,
    language: patch.language,
    visibility: patch.visibility,
    updated_at: nowIso(),
  };
  await db.songs.put(updated);
  invalidateSongIndex();
}

export async function deleteSong(id: string): Promise<void> {
  await db.songs.delete(id);
  invalidateSongIndex();
}

/**
 * Sérialise tous les chants en JSON pour backup utilisateur.
 * Inclut un en-tête `meta` pour faciliter une future re-import.
 */
export async function exportSongsAsBlob(churchId?: string): Promise<Blob> {
  const songs = churchId
    ? await db.songs.where("church_id").equals(churchId).toArray()
    : await db.songs.toArray();
  const payload = {
    meta: {
      kind: "fihirana-songs-export",
      version: 1,
      exported_at: nowIso(),
      count: songs.length,
    },
    songs,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
