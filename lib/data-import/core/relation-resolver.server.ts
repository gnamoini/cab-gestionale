import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MezzoCandidate, MezzoResolutionResult } from "@/lib/domain/mezzo/mezzo-resolution";

function norm(v: string): string {
  return v.trim().toLowerCase();
}

export type RelationLookupResult =
  | { ok: true; id?: string; canonical: string }
  | { ok: false; message: string };

export type MezzoRelationLookupResult =
  | { ok: true; id: string; mezzoId: string; canonical: string }
  | { ok: false; message: string; ambiguous?: MezzoCandidate[] };

function rowToCandidate(row: {
  id: string;
  cliente?: string | null;
  targa?: string | null;
  matricola?: string | null;
  numero_scuderia?: string | null;
}, signals: string[]): MezzoCandidate {
  return {
    mezzoId: row.id,
    cliente: row.cliente ?? "",
    targa: row.targa,
    matricola: row.matricola,
    numeroScuderia: row.numero_scuderia,
    matchSignals: signals,
  };
}

async function lookupMezziByField(
  sb: SupabaseClient,
  field: "targa" | "matricola",
  value: string,
): Promise<Array<{ id: string; targa?: string | null; matricola?: string | null; cliente?: string | null; numero_scuderia?: string | null }>> {
  const { data, error } = await sb
    .from("mezzi")
    .select("id, targa, matricola, cliente, numero_scuderia")
    .eq(field, value)
    .limit(3);
  if (error || !data) return [];
  return data;
}

export async function lookupMezzoByTargaOrMatricola(
  sb: SupabaseClient,
  input: { targa?: string; matricola?: string },
): Promise<MezzoRelationLookupResult> {
  const targa = input.targa?.trim();
  const matricola = input.matricola?.trim();

  if (targa) {
    const rows = await lookupMezziByField(sb, "targa", targa);
    if (rows.length === 1) {
      const data = rows[0]!;
      return { ok: true, id: data.id, mezzoId: data.id, canonical: data.targa ?? targa };
    }
    if (rows.length > 1) {
      return {
        ok: false,
        message: `Più mezzi con targa «${targa}».`,
        ambiguous: rows.map((r) => rowToCandidate(r, ["targa:exact"])),
      };
    }
  }

  if (matricola) {
    const rows = await lookupMezziByField(sb, "matricola", matricola);
    if (rows.length === 1) {
      const data = rows[0]!;
      return { ok: true, id: data.id, mezzoId: data.id, canonical: data.matricola ?? matricola };
    }
    if (rows.length > 1) {
      return {
        ok: false,
        message: `Più mezzi con matricola «${matricola}».`,
        ambiguous: rows.map((r) => rowToCandidate(r, ["matricola:exact"])),
      };
    }
  }

  return { ok: false, message: "Mezzo non trovato (targa o matricola)." };
}

/** Contract unificato per import server-side. */
export async function resolveMezzoRelationFromDb(
  sb: SupabaseClient,
  input: { targa?: string; matricola?: string },
): Promise<MezzoResolutionResult> {
  const lookup = await lookupMezzoByTargaOrMatricola(sb, input);
  if (lookup.ok) {
    return { status: "resolved", mezzoId: lookup.mezzoId, source: "ident" };
  }
  if (lookup.ambiguous?.length) {
    return {
      status: "ambiguous",
      candidates: lookup.ambiguous,
      identUsed: { targa: input.targa, matricola: input.matricola },
    };
  }
  return { status: "not_found", identUsed: { targa: input.targa, matricola: input.matricola } };
}

/** FASE 5: auto-associa solo con identificativo fiscale univoco. Nome/label = suggest manuale. */
export async function lookupClienteByNameOrPiva(
  sb: SupabaseClient,
  input: { nome?: string; partitaIva?: string },
): Promise<RelationLookupResult> {
  if (input.partitaIva?.trim()) {
    const piva = input.partitaIva.replace(/\D/g, "");
    if (piva.length === 11) {
      const { data: rows } = await sb
        .from("clienti_anagrafiche")
        .select("id, nome_display")
        .eq("partita_iva_normalized", piva);
      if (rows?.length === 1) {
        return { ok: true, id: rows[0]!.id, canonical: rows[0]!.nome_display };
      }
      if (rows && rows.length > 1) {
        return { ok: false, message: "Più anagrafiche con la stessa P.IVA — revisione manuale richiesta." };
      }
    }
  }
  const nome = input.nome?.trim();
  if (!nome) return { ok: false, message: "Cliente non specificato." };
  return { ok: false, message: `Cliente «${nome}» — selezione manuale richiesta (nessun match fiscale univoco).` };
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
