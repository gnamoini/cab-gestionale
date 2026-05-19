import type { LogModificaRow } from "@/src/types/supabase-tables";

export type AuditDiffPayload = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reverted?: boolean;
  reverted_at?: string;
  reverted_by?: string | null;
  undo_session_id?: string;
};

export function auditPayload(row: LogModificaRow): AuditDiffPayload {
  return row.payload && typeof row.payload === "object" ? (row.payload as AuditDiffPayload) : {};
}

export function undoSessionIdFromLog(row: LogModificaRow): string | null {
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const sid = (p as Record<string, unknown>).undo_session_id;
  return typeof sid === "string" && sid.trim() ? sid.trim() : null;
}

export function isLogReverted(row: LogModificaRow): boolean {
  return auditPayload(row).reverted === true || row.azione === "UNDO";
}

function isUndoableUpdateRow(row: LogModificaRow, entita: string): boolean {
  return row.entita === entita && row.azione === "UPDATE" && !isLogReverted(row) && Boolean(auditPayload(row).before);
}

/** @deprecated Preferire `latestUndoableLogForUserSession`. */
export function latestUndoableLog(rows: LogModificaRow[], entita: string): LogModificaRow | null {
  return rows.find((row) => isUndoableUpdateRow(row, entita)) ?? null;
}

/** Ultima modifica annullabile dell'utente corrente nella sessione corrente (LIFO). */
export function latestUndoableLogForUserSession(
  rows: LogModificaRow[],
  entita: string,
  userId: string | null | undefined,
  sessionId: string | null | undefined,
): LogModificaRow | null {
  if (!userId || !sessionId) return null;
  return (
    rows.find((row) => {
      if (!isUndoableUpdateRow(row, entita)) return false;
      if (row.autore_id !== userId) return false;
      return undoSessionIdFromLog(row) === sessionId;
    }) ?? null
  );
}

export function pickExistingFields<T extends Record<string, unknown>>(source: Record<string, unknown> | null | undefined, keys: readonly (keyof T)[]): Partial<T> {
  if (!source) return {};
  const out: Partial<T> = {};
  for (const key of keys) {
    if (key in source) out[key] = source[key as string] as T[keyof T];
  }
  return out;
}
