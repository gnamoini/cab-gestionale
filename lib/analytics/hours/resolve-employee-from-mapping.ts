import type { AddettiEmployeeMappingRow } from "@/src/types/supabase-tables";
import { normalizeAddettoMappingKey } from "@/lib/analytics/hours/normalize-addetto-mapping-key";

export function buildAddettiEmployeeMappingIndex(
  rows: readonly AddettiEmployeeMappingRow[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(normalizeAddettoMappingKey(row.addetto_nome), row.employee_id);
  }
  return map;
}

export function resolveEmployeeIdFromMapping(
  addettoNome: string,
  mapping: ReadonlyMap<string, string>,
): string | null {
  const key = normalizeAddettoMappingKey(addettoNome);
  if (!key) return null;
  return mapping.get(key) ?? null;
}
