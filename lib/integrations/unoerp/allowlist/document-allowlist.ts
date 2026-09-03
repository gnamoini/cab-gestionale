import type { CabDocumentType } from "@/lib/integrations/unoerp/types";

/** Allowlist campi UnoERP. Vuota finché discovery non popola i nomi reali. */
const CREATE: Record<CabDocumentType, readonly string[]> = {
  preventivo: [],
  consuntivo: [],
  ddt: [],
};

const UPDATE: Record<CabDocumentType, readonly string[]> = {
  preventivo: [],
  consuntivo: [],
  ddt: [],
};

export function getAllowedFields(type: CabDocumentType, op: "CREATE" | "UPDATE"): readonly string[] {
  return op === "CREATE" ? CREATE[type] : UPDATE[type];
}

export function assertPayloadAllowlist(
  type: CabDocumentType,
  op: "CREATE" | "UPDATE",
  payload: Record<string, unknown>,
): { ok: true } | { ok: false; extra: string[] } {
  const allowed = new Set(getAllowedFields(type, op));
  const extra = Object.keys(payload).filter((k) => !allowed.has(k));
  if (extra.length > 0) return { ok: false, extra };
  return { ok: true };
}
