/**
 * Supabase è la source of truth per le schede lavorazione.
 * Opt-out esplicito solo per debug/migrazione: NEXT_PUBLIC_SCHEDE_LOCAL_PRIMARY=true
 */
export function isSchedeDbPrimary(): boolean {
  return process.env.NEXT_PUBLIC_SCHEDE_LOCAL_PRIMARY !== "true";
}
