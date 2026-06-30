import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

function norm(v: string): string {
  return v.trim().toLowerCase();
}

export type RelationLookupResult =
  | { ok: true; id?: string; canonical: string }
  | { ok: false; message: string };

export async function lookupClienteByNameOrPiva(
  sb: SupabaseClient,
  input: { nome?: string; partitaIva?: string },
): Promise<RelationLookupResult> {
  if (input.partitaIva?.trim()) {
    const piva = input.partitaIva.replace(/\D/g, "");
    if (piva.length === 11) {
      const { data } = await sb
        .from("clienti_anagrafiche")
        .select("id, nome_display")
        .eq("partita_iva", piva)
        .maybeSingle();
      if (data) return { ok: true, id: data.id, canonical: data.nome_display };
    }
  }
  const nome = input.nome?.trim();
  if (!nome) return { ok: false, message: "Cliente non specificato." };
  const { data: rows } = await sb.from("clienti_anagrafiche").select("id, nome_display").ilike("nome_display", nome);
  const hit = (rows ?? []).find((r) => norm(r.nome_display) === norm(nome));
  if (hit) return { ok: true, id: hit.id, canonical: hit.nome_display };
  const { data: settingsRow } = await sb.from("app_settings").select("payload").eq("module", "mezzi").eq("key", "liste").maybeSingle();
  const payload = (settingsRow?.payload && typeof settingsRow.payload === "object" ? settingsRow.payload : {}) as Record<
    string,
    unknown
  >;
  const clienti = Array.isArray(payload.clienti) ? (payload.clienti as string[]) : [];
  const settingsHit = clienti.find((c) => norm(c) === norm(nome));
  if (settingsHit) return { ok: true, canonical: settingsHit };
  return { ok: false, message: `Cliente «${nome}» non trovato.` };
}

export async function lookupMezzoByTargaOrMatricola(
  sb: SupabaseClient,
  input: { targa?: string; matricola?: string },
): Promise<RelationLookupResult & { mezzoId?: string }> {
  const targa = input.targa?.trim();
  const matricola = input.matricola?.trim();
  if (targa) {
    const { data } = await sb.from("mezzi").select("id, targa, matricola, cliente").eq("targa", targa).maybeSingle();
    if (data) return { ok: true, id: data.id, mezzoId: data.id, canonical: data.targa ?? targa };
  }
  if (matricola) {
    const { data } = await sb.from("mezzi").select("id, targa, matricola, cliente").eq("matricola", matricola).maybeSingle();
    if (data) return { ok: true, id: data.id, mezzoId: data.id, canonical: data.matricola ?? matricola };
  }
  return { ok: false, message: "Mezzo non trovato (targa o matricola)." };
}

export async function ensureSettingsListValue(
  sb: SupabaseClient,
  module: string,
  key: string,
  listField: string,
  value: string,
): Promise<{ canonical: string; created: boolean }> {
  const trimmed = value.trim();
  if (!trimmed) return { canonical: "", created: false };
  const { data: row } = await sb.from("app_settings").select("payload").eq("module", module).eq("key", key).maybeSingle();
  const payload = (row?.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
  const list = Array.isArray(payload[listField]) ? [...(payload[listField] as string[])] : [];
  const hit = list.find((x) => norm(x) === norm(trimmed));
  if (hit) return { canonical: hit, created: false };
  list.push(trimmed);
  list.sort((a, b) => a.localeCompare(b, "it"));
  await sb.rpc("bulk_upsert_app_settings", {
    p_items: [{ module, key, payload: { ...payload, [listField]: list } }],
  });
  return { canonical: trimmed, created: true };
}

export function suggestImportStrategy(duplicateRatio: number): "initial" | "incremental" | "sync" | "merge" {
  if (duplicateRatio >= 0.3) return "incremental";
  if (duplicateRatio >= 0.1) return "sync";
  return "initial";
}
