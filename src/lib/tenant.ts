/**
 * Église active pour la session courante. À terme : déduite du compte
 * connecté (Supabase auth, claim "church_id"). Pour l'instant : slug par défaut
 * lu depuis l'env, résolu via la table Church locale.
 */

import { db } from "@/lib/db";
import type { Church } from "@/lib/db/schema";

const DEFAULT_SLUG = import.meta.env.VITE_DEFAULT_CHURCH_SLUG ?? "vif";

let cached: Church | null = null;

export async function getActiveChurch(): Promise<Church | null> {
  if (cached) return cached;
  const church = await db.churches.where("slug").equals(DEFAULT_SLUG).first();
  cached = church ?? null;
  return cached;
}

export function clearActiveChurchCache(): void {
  cached = null;
}
