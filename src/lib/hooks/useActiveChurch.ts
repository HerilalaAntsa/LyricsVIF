import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Church } from "@/lib/db/schema";

const DEFAULT_SLUG = import.meta.env.VITE_DEFAULT_CHURCH_SLUG ?? "vif";

export function useActiveChurch(): Church | undefined {
  return useLiveQuery(() => db.churches.where("slug").equals(DEFAULT_SLUG).first(), []);
}
