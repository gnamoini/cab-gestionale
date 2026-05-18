import type { LogModificaRow } from "@/src/types/supabase-tables";

export type AuditDiffPayload = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reverted?: boolean;
  reverted_at?: string;
  reverted_by?: string | null;
};

export function auditPayload(row: LogModificaRow): AuditDiffPayload {
  return row.payload && typeof row.payload === "object" ? (row.payload as AuditDiffPayload) : {};
}

export function isLogReverted(row: LogModificaRow): boolean {
  return auditPayload(row).reverted === true || row.azione === "UNDO";
}

export function latestUndoableLog(rows: LogModificaRow[], entita: string): LogModificaRow | null {
  return rows.find((row) => row.entita === entita && row.azione === "UPDATE" && !isLogReverted(row) && Boolean(auditPayload(row).before)) ?? null;
}

export function pickExistingFields<T extends Record<string, unknown>>(source: Record<string, unknown> | null | undefined, keys: readonly (keyof T)[]): Partial<T> {
  if (!source) return {};
  const out: Partial<T> = {};
  for (const key of keys) {
    if (key in source) out[key] = source[key as string] as T[keyof T];
  }
  return out;
}
