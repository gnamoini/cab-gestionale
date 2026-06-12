import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildKnownClientiSet } from "@/src/lib/auth/cliente-portal-scope";

async function fetchKnownClientiSetFromMezzi(sb: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await sb.from("mezzi").select("cliente");
  if (error) throw new Error(error.message);
  const names: string[] = [];
  for (const row of data ?? []) {
    const c = (row as { cliente?: string | null }).cliente;
    if (typeof c === "string" && c.trim()) names.push(c);
  }
  return buildKnownClientiSet(names);
}

/** Dedupe per-request su server (React cache). */
const loadKnownClientiSetCached = cache(fetchKnownClientiSetFromMezzi);

/** Etichette distinte da `mezzi.cliente` (anagrafica clienti). */
export async function loadKnownClientiSetFromMezzi(sb: SupabaseClient): Promise<Set<string>> {
  return loadKnownClientiSetCached(sb);
}
