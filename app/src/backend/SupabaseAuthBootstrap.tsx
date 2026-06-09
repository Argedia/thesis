import { useEffect } from "react";
import { ensureSupabaseAnonymousSession, isSupabaseConfigured } from "./supabaseClient";

export function SupabaseAuthBootstrap() {
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    void ensureSupabaseAnonymousSession().catch(() => {
      // Anonymous session is best-effort; analytics will be skipped if unavailable.
    });
  }, []);

  return null;
}
