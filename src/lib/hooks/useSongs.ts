import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Song } from "@/lib/db/schema";
import { searchSongs } from "@/lib/search/songs";

export function useSongs(churchId: string | undefined): Song[] | undefined {
  return useLiveQuery(async () => {
    if (!churchId) return [];
    return db.songs.where("church_id").equals(churchId).sortBy("title");
  }, [churchId]);
}

export function useSong(id: string | undefined): Song | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    return db.songs.get(id);
  }, [id]);
}

/**
 * Recherche live : retourne les chants matchant `query` (ou tous si vide).
 * Repli des diacritiques + recherche par préfixe (MiniSearch).
 */
export function useFilteredSongs(
  churchId: string | undefined,
  query: string,
): Song[] {
  const all = useSongs(churchId);
  const [matchIds, setMatchIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    if (!q || !churchId) {
      setMatchIds(null);
      return;
    }
    void searchSongs(q, churchId).then((ids) => {
      if (!cancelled) setMatchIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, [query, churchId]);

  return useMemo(() => {
    if (!all) return [];
    if (matchIds === null) return all;
    const filtered = all.filter((s) => matchIds.has(s.id));
    // Ordre de pertinence : on remet les résultats de search en premier (idéalement
    // on respecterait le score MiniSearch, mais l'ordre alphabétique du `all`
    // est déjà acceptable pour v1 — à raffiner quand on ajoutera le scoring UI).
    return filtered;
  }, [all, matchIds]);
}
