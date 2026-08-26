import type { SupabaseClient } from "@supabase/supabase-js";

/** Rimuove sessione Supabase su tutti i dispositivi del refresh token. */
export async function clearInvalidAuthSession(sb: SupabaseClient): Promise<void> {
  try {
    await sb.auth.signOut({ scope: "global" });
  } catch {
    /* ignore */
  }
}

export function isInvalidRefreshAuthMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("invalid refresh token") ||
    m.includes("refresh token not found") ||
    m.includes("invalid jwt") ||
    (m.includes("jwt expired") && m.includes("refresh")) ||
    m.includes("session expired")
  );
}
