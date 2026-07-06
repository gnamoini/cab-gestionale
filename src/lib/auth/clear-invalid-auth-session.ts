import type { SupabaseClient } from "@supabase/supabase-js";

/** Rimuove cookie e storage locale Supabase (solo sessione corrente — non altri dispositivi). */
export async function clearInvalidAuthSession(sb: SupabaseClient): Promise<void> {
  try {
    await sb.auth.signOut({ scope: "local" });
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
