import { useEffect } from "react";
import { ensureSupabaseAnonymousSession, isSupabaseConfigured } from "./supabaseClient";

export function SupabaseAuthBootstrap() {
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    void ensureSupabaseAnonymousSession().catch((error) => {
      console.error("Supabase anonymous auth bootstrap failed.", error);
    });
  }, []);

  return null;
}
