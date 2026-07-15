/** Valore effettivo per hash PLAN_STALE — confirmed ?? normalized. */

export type CaptureFieldHashRow = {
  field_key: string;
  confirmed_value?: string | null;
  normalized_value?: string | null;
};

export function resolveFieldValueForHash(row: CaptureFieldHashRow): string | null {
  if (row.confirmed_value != null && row.confirmed_value !== "") {
    return row.confirmed_value;
  }
  return row.normalized_value ?? null;
}

export function resolveFieldsForHash(
  fields: ReadonlyArray<CaptureFieldHashRow>,
): Array<{ field_key: string; confirmed_value: string | null }> {
  return fields.map((f) => ({
    field_key: f.field_key,
    confirmed_value: resolveFieldValueForHash(f),
  }));
}
