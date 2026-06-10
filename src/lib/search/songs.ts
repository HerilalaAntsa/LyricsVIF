import MiniSearch from "minisearch";
import { db } from "@/lib/db";
import { normalize } from "./normalize";

interface IndexedSong {
  id: string;
  title: string;
  author: string;
  content: string;
}

let cache: { churchId: string; idx: MiniSearch<IndexedSong> } | null = null;

function makeIndex(): MiniSearch<IndexedSong> {
  return new MiniSearch<IndexedSong>({
    fields: ["title", "author", "content"],
    storeFields: ["id"],
    processTerm: (term) => normalize(term),
    searchOptions: {
      processTerm: (term) => normalize(term),
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 3, author: 2 },
    },
  });
}

export async function buildSongIndex(churchId: string): Promise<MiniSearch<IndexedSong>> {
  if (cache && cache.churchId === churchId) return cache.idx;
  const songs = await db.songs.where("church_id").equals(churchId).toArray();
  const idx = makeIndex();
  idx.addAll(
    songs.map((s) => ({
      id: s.id,
      title: s.title,
      author: s.author ?? "",
      content: s.sections.flatMap((sec) => sec.lines).join(" "),
    })),
  );
  cache = { churchId, idx };
  return idx;
}

export function invalidateSongIndex(): void {
  cache = null;
}

export async function searchSongs(query: string, churchId: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  const idx = await buildSongIndex(churchId);
  return idx.search(q).map((r) => r.id as string);
}
