/**
 * Seed initial du corpus VIF : ~322 chants + l'église VIF.
 *
 * Stratégie : on importe les JSON en static (bundle Vite) — ils sont donc
 * précachés automatiquement par le service worker. Le seed ne s'exécute que
 * si la table songs est vide (premier lancement ou base remise à zéro).
 */

import { db } from "./index";
import type { Church, Song } from "./schema";
import churchesSeed from "@/seed/churches.json";
import songsSeed from "@/seed/songs.json";

export async function ensureSeeded(): Promise<void> {
  const songCount = await db.songs.count();
  if (songCount > 0) return;

  await db.transaction("rw", db.churches, db.songs, async () => {
    await db.churches.bulkPut(churchesSeed as Church[]);
    await db.songs.bulkPut(songsSeed as Song[]);
  });

  console.info(
    `[seed] ${(songsSeed as Song[]).length} chants et ${(churchesSeed as Church[]).length} église(s) chargés`,
  );
}
