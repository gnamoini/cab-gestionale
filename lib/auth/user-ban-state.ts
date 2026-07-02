/**
 * SSOT ban state da Auth user (campo `banned_until` su User @supabase/auth-js).
 * Nessun accesso diretto a banned_until fuori da questo modulo.
 */

export type AuthUserBanFields = {
  banned_until?: string | null;
};

export function bannedUntilFromAuthUser(authUser: AuthUserBanFields | null | undefined): string | null {
  const raw = authUser?.banned_until;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw;
}

/** Utente attualmente bannato (ban attivo nel futuro). */
export function isUserBanned(authUser: AuthUserBanFields | null | undefined): boolean {
  const until = bannedUntilFromAuthUser(authUser);
  if (!until) return false;
  const ts = Date.parse(until);
  if (Number.isNaN(ts)) return false;
  return ts > Date.now();
}

export function accountEnabledFromAuthUser(authUser: AuthUserBanFields | null | undefined): boolean {
  return !isUserBanned(authUser);
}
