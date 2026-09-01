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

export type MergeAttrezzaturaPatchOptions = {
  /** Campi da sovrascrivere anche se già valorizzati (edit anagrafica confermato). */
  overwriteFields?: ReadonlySet<AttrezzaturaMergeField>;
};

/** Null-safe merge: existing wins on conflict, salvo `overwriteFields`. */
export function mergeAttrezzaturaPatch(
  existing: AttrezzaturaRow,
  incoming: AttrezzaturaIncomingPatch,
  options?: MergeAttrezzaturaPatchOptions,
): { patch: AttrezzaturaIncomingPatch; conflicts: AttrezzaturaMergeConflict[] } {
  const patch: AttrezzaturaIncomingPatch = {};
  const conflicts: AttrezzaturaMergeConflict[] = [];
  const overwrite = options?.overwriteFields;

  for (const field of ATTREZZATURA_MERGE_FIELDS) {
    const ex = fieldValue(existing, field);
    const inc = fieldValue(incoming, field);

    if (overwrite?.has(field)) {
      if (inc === undefined) continue;
      if (isEmptyValue(inc) && field !== "matricola" && field !== "tipo_attrezzatura") continue;
      if (!valuesEqual(ex, inc)) {
        patch[field] = inc as never;
      }
      continue;
    }

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
