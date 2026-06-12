import { PROFILES_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { SupabaseClient } from "@supabase/supabase-js";

const PROFILE_NAME_COLUMNS = PROFILES_COLUMNS.split(", ")
  .filter((c) => c === "id" || c === "nome")
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

  for (const row of (data ?? []) as { id?: string | null; nome?: string | null }[]) {
    const id = typeof row.id === "string" ? row.id : "";
    const nome = typeof row.nome === "string" ? row.nome.trim() : "";
    if (id && nome) out.set(id, nome);
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
