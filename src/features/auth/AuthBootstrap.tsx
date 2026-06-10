import { useEffect } from "react";
import { useSession } from "@/lib/auth/session";
import { clearCurrentUser, syncProfile } from "@/lib/auth/profile";

/**
 * Composant invisible monté au top de l'app : synchronise le profil
 * applicatif Supabase → Dexie à chaque changement de session.
 */
export function AuthBootstrap() {
  const { session } = useSession();

  useEffect(() => {
    if (session) {
      void syncProfile(session);
    } else {
      clearCurrentUser();
    }
  }, [session]);

  return null;
}
