import "server-only";

import { pickPrimaryAttrezzatura } from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import { ATTREZZATURE_COLUMNS } from "@/lib/db/table-select-columns";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MezziImportAttrezzaturaFields = {
  marca?: string;
  modello?: string;
  matricola?: string;
  tipo_attrezzatura?: string;
  anno?: number;
};

function norm(v: string): string {
  return v.trim().toLowerCase();
}

export function attrezzaturaPayloadFromImportRow(
  row: MezziImportAttrezzaturaFields,
): { payload: Omit<AttrezzaturaRow, "id" | "created_at" | "updated_at" | "created_by" | "mezzo_id"> } | { error: string } | null {
  const hasAny =
    row.marca?.trim() ||
    row.modello?.trim() ||
    row.matricola?.trim() ||
    row.tipo_attrezzatura?.trim();
  if (!hasAny) return null;
  const marca = row.marca?.trim();
  if (!marca) return { error: "Marca obbligatoria se presenti dati attrezzatura." };
  return {
    payload: {
      marca,
      modello: row.modello?.trim() || "—",
      matricola: row.matricola?.trim() || null,
      tipo_attrezzatura: row.tipo_attrezzatura?.trim() || null,
      portata: null,
      anno: row.anno ?? null,
      note: null,
    },
  };
}

async function listAttrezzatureForMezzo(sb: SupabaseClient, mezzoId: string): Promise<AttrezzaturaRow[]> {
  const { data, error } = await sb
    .from("attrezzature")
    .select(ATTREZZATURE_COLUMNS)
    .eq("mezzo_id", mezzoId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AttrezzaturaRow[];
}

function findAttrezzaturaForUpsert(
  rows: readonly AttrezzaturaRow[],
  mezzoId: string,
  matricola?: string,
): AttrezzaturaRow | null {
  const mat = matricola?.trim();
  if (mat) {
    const hit = rows.find((a) => a.mezzo_id === mezzoId && a.matricola?.trim() && norm(a.matricola) === norm(mat));
    if (hit) return hit;
  }
  return pickPrimaryAttrezzatura(rows, mezzoId);
}

/** Crea o aggiorna attrezzatura collegata al mezzo importato (V2). */
export async function upsertAttrezzaturaForMezzoImport(
  sb: SupabaseClient,
  mezzoId: string,
  row: MezziImportAttrezzaturaFields,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = attrezzaturaPayloadFromImportRow(row);
  if (!parsed) return { ok: true };
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const existing = await listAttrezzatureForMezzo(sb, mezzoId);
  const target = findAttrezzaturaForUpsert(existing, mezzoId, row.matricola);

  if (target) {
    const { error } = await sb.from("attrezzature").update(parsed.payload).eq("id", target.id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const { error } = await sb.from("attrezzature").insert({ mezzo_id: mezzoId, ...parsed.payload });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
