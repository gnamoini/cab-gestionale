/**
 * Chiave service role: solo server (Server Actions, Route Handlers).
 * Mai esporre al client o prefisso NEXT_PUBLIC_.
 */
export function readSupabaseServiceRoleKey(): string | null {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return k || null;
}

export function assertSupabaseServiceRoleKey(): string {
  const k = readSupabaseServiceRoleKey();
  if (!k) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server-only)");
  }
  return k;
}
