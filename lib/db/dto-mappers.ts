import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow, MezzoRow } from "@/src/types/supabase-tables";

/** Normalizza embed mezzo PostgREST → `MezzoRow` parziale compatibile UI. */
export function embedMezzoDto(raw: unknown): MezzoRow | null {
  if (raw == null) return null;
  const row = (Array.isArray(raw) ? raw[0] : raw) as MezzoRow | null | undefined;
  return row ?? null;
}

/** Garantisce `meta` per adapter UI quando la lista light omette il campo. */
export function mapMezzoLightToRow(raw: MezzoRow): MezzoRow {
  return {
    ...raw,
    meta: raw.meta ?? null,
  };
}

type LavorazioneLightRaw = LavorazioneRow & {
  mezzi?: unknown;
  updated_by_profile?: { nome?: string | null } | { nome?: string | null }[] | null;
  created_by_profile?: { nome?: string | null } | { nome?: string | null }[] | null;
};

function embedProfileNome(
  raw: { nome?: string | null } | { nome?: string | null }[] | null | undefined,
): string | null {
  if (raw == null) return null;
  const p = Array.isArray(raw) ? raw[0] : raw;
  const nome = p?.nome?.trim();
  return nome || null;
}

/** Mappa riga lista LIGHT/DETAIL → `LavorazioneListRow` (shape UI invariata). */
export function mapLavorazioneLightToListRow(
  raw: LavorazioneLightRaw,
  options?: { includeMezzo?: boolean },
): LavorazioneListRow {
  const includeMezzo = options?.includeMezzo !== false;
  const { mezzi: em, updated_by_profile, created_by_profile, ...rest } = raw;
  return {
    ...(rest as LavorazioneRow),
    archived: rest.archived === true,
    mezzo: includeMezzo ? embedMezzoDto(em) : null,
    updated_by_nome: embedProfileNome(updated_by_profile),
    created_by_nome: embedProfileNome(created_by_profile),
  };
}

/** Join `mezzo_id` → anagrafica per report (sostituisce embed PostgREST). */
export function enrichLavorazioneListRowsWithMezzi(
  rows: readonly LavorazioneListRow[],
  mezziById: ReadonlyMap<string, MezzoRow>,
): LavorazioneListRow[] {
  return rows.map((row) => {
    const mezzoId = row.mezzo_id?.trim();
    if (!mezzoId || row.mezzo != null) return row;
    const mezzo = mezziById.get(mezzoId) ?? null;
    if (!mezzo) return row;
    return { ...row, mezzo };
  });
}

export function mezziRowsToIdMap(mezzi: readonly MezzoRow[]): Map<string, MezzoRow> {
  const map = new Map<string, MezzoRow>();
  for (const m of mezzi) {
    if (m.id) map.set(m.id, m);
  }
  return map;
}
