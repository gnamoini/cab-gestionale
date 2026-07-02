import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Client Supabase service role — solo server (no "use server" file). */
export function createServiceAdminClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
