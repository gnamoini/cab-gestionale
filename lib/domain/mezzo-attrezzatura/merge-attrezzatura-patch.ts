import type { AttrezzaturaRow } from "@/src/types/supabase-tables";

export const ATTREZZATURA_MERGE_FIELDS = [
  "tipo_attrezzatura",
  "marca",
  "modello",
  "portata",
  "anno",
  "note",
  "matricola",
] as const;

export type AttrezzaturaMergeField = (typeof ATTREZZATURA_MERGE_FIELDS)[number];

export type AttrezzaturaMergeConflict = {
  field: AttrezzaturaMergeField;
  existingValue: string | number | null;
  incomingValue: string | number | null;
  resolution: "kept_existing";
};

export type AttrezzaturaIncomingPatch = Partial<
  Pick<AttrezzaturaRow, AttrezzaturaMergeField>
>;

function fieldValue(row: AttrezzaturaRow | AttrezzaturaIncomingPatch, field: AttrezzaturaMergeField) {
  return row[field] ?? null;
}

function isEmptyValue(v: string | number | null | undefined): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

function valuesEqual(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  if (isEmptyValue(a) && isEmptyValue(b)) return true;
  if (typeof a === "number" || typeof b === "number") return a === b;
  return String(a).trim() === String(b).trim();
}

/** Null-safe merge: existing wins on conflict. */
export function mergeAttrezzaturaPatch(
  existing: AttrezzaturaRow,
  incoming: AttrezzaturaIncomingPatch,
): { patch: AttrezzaturaIncomingPatch; conflicts: AttrezzaturaMergeConflict[] } {
  const patch: AttrezzaturaIncomingPatch = {};
  const conflicts: AttrezzaturaMergeConflict[] = [];

  for (const field of ATTREZZATURA_MERGE_FIELDS) {
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
