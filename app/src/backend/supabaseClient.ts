import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ??
  "";

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabasePublishableKey.length > 0;

let clientInstance: SupabaseClient | null = null;
let authReadyPromise: Promise<void> | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
  }

  return clientInstance;
};

export const ensureSupabaseAnonymousSession = async (): Promise<void> => {
  if (!isSupabaseConfigured) {
    return;
  }

  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      const client = getSupabaseClient();
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      if (sessionData.session?.user?.id) {
        return;
      }

      const { data: anonData, error } = await client.auth.signInAnonymously();
      if (error) {
        throw error;
      }
    })().catch((error) => {
      authReadyPromise = null;
      throw error;
    });
  }

  await authReadyPromise;
};
