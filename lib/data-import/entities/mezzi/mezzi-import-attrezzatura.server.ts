import "server-only";

import { buildServerAttrezzaturaResolveDeps } from "@/lib/domain/mezzo-attrezzatura/build-server-attrezzatura-resolve-deps";
import { resolveOrCreateAttrezzatura } from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MezziImportAttrezzaturaFields = {
  marca?: string;
  modello?: string;
  matricola?: string;
  tipo_attrezzatura?: string;
  anno?: number;
};

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

/** Crea o aggiorna attrezzatura collegata al mezzo importato (V2). */
export async function upsertAttrezzaturaForMezzoImport(
  sb: SupabaseClient,
  mezzoId: string,
  row: MezziImportAttrezzaturaFields,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = attrezzaturaPayloadFromImportRow(row);
  if (!parsed) return { ok: true };
  if ("error" in parsed) return { ok: false, message: parsed.error };

  try {
    const deps = buildServerAttrezzaturaResolveDeps(sb);
    await resolveOrCreateAttrezzatura(
      { mezzoId, incoming: { mezzo_id: mezzoId, ...parsed.payload } },
      deps,
    );
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore attrezzatura import.";
    return { ok: false, message };
  }
}
