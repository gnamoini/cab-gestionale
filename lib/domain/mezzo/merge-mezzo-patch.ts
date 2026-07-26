import type { MezzoRow } from "@/src/types/supabase-tables";

export const MEZZO_MERGE_FIELDS = [
  "cliente",
  "utilizzatore",
  "targa",
  "numero_scuderia",
  "marca_telaio",
  "modello_telaio",
  "tipo_telaio",
  "telaio_num",
  "anno",
  "km",
  "note",
  "meta",
] as const;

export type MezzoMergeField = (typeof MEZZO_MERGE_FIELDS)[number];

export type MezzoMergeConflict = {
  field: MezzoMergeField;
  existingValue: string | number | Record<string, unknown> | null;
  incomingValue: string | number | Record<string, unknown> | null;
  resolution: "kept_existing";
};

export type MezzoIncomingPatch = Partial<Pick<MezzoRow, MezzoMergeField>>;

function fieldValue(row: MezzoRow | MezzoIncomingPatch, field: MezzoMergeField) {
  return row[field] ?? null;
}

function isEmptyValue(v: string | number | Record<string, unknown> | null | undefined): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

function valuesEqual(
  a: string | number | Record<string, unknown> | null | undefined,
  b: string | number | Record<string, unknown> | null | undefined,
): boolean {
  if (isEmptyValue(a) && isEmptyValue(b)) return true;
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  if (typeof a === "number" || typeof b === "number") return a === b;
  return String(a).trim() === String(b).trim();
}

/** Null-safe merge: existing wins on conflict. */
export function mergeMezzoPatch(
  existing: MezzoRow,
  incoming: MezzoIncomingPatch,
): { patch: MezzoIncomingPatch; conflicts: MezzoMergeConflict[] } {
  const patch: MezzoIncomingPatch = {};
  const conflicts: MezzoMergeConflict[] = [];

  for (const field of MEZZO_MERGE_FIELDS) {
    const ex = fieldValue(existing, field);
    const inc = fieldValue(incoming, field);

    if (isEmptyValue(inc)) continue;
    if (isEmptyValue(ex)) {
      patch[field] = inc as never;
      continue;
    }
    if (valuesEqual(ex, inc)) continue;

    conflicts.push({
      field,
      existingValue: ex,
      incomingValue: inc,
      resolution: "kept_existing",
    });
  }

  return { patch, conflicts };
}
