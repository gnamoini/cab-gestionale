/**
 * Variabili Supabase pubbliche (solo NEXT_PUBLIC_*).
 * Fonte: `.env.local`, Vercel Environment Variables, o Supabase Dashboard → API.
 * Non usare mai service_role o segreti nel client.
 */

/** Messaggio unico se URL o anon key non sono configurati. */
export const MISSING_SUPABASE_ENV_MESSAGE = "Missing Supabase environment variables";

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

/**
 * Legge e normalizza (trim) le variabili pubbliche.
 * @returns `null` se una delle due manca o è solo spazi.
 */
export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabasePublicEnvConfigured(): boolean {
  return readSupabasePublicEnv() !== null;
}

/** Per codice che deve inizializzare il client: fallisce con messaggio stabile. */
export function assertSupabasePublicEnv(): SupabasePublicEnv {
  const v = readSupabasePublicEnv();
  if (!v) throw new Error(MISSING_SUPABASE_ENV_MESSAGE);
  return v;
}
