import { PROFILES_COLUMNS } from "@/lib/db/table-select-columns";
import { profileDisplayName } from "@/lib/auth/profile-display-name";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { SupabaseClient } from "@supabase/supabase-js";

const PROFILE_NAME_COLUMNS = PROFILES_COLUMNS.split(", ")
  .filter((c) => c === "id" || c === "nome" || c === "cognome")
  .join(", ");

export async function fetchProfileNamesByIds(
  sb: SupabaseClient,
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  const { data, error } = await sb.from("profiles").select(PROFILE_NAME_COLUMNS).in("id", unique);
  if (error) return out;

  for (const row of (data ?? []) as { id?: string | null; nome?: string | null; cognome?: string | null }[]) {
    const id = typeof row.id === "string" ? row.id : "";
    const label = profileDisplayName({ nome: row.nome ?? "", cognome: row.cognome });
    if (id && label) out.set(id, label);
  }
  return out;
}

/** Batch nomi profilo per «ultima modifica» mobile (senza embed lista). */
export async function fetchProfileNamesByIdsAuthorized(
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const sb = getBrowserSupabase();
  return fetchProfileNamesByIds(sb, userIds);
}
