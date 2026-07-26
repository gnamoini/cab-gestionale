/** Legacy payload type for writeModificaLog callers. */
export type AuditPayload = unknown;

export type AuditAzione =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "ATTREZZATURA_RESOLVED_EXISTING"
  | "ATTREZZATURA_CONFLICT_KEPT"
  | "MEZZO_RESOLVED_EXISTING"
  | "MEZZO_CONFLICT_KEPT"
  | "MEZZO_DUPLICATE_PREVENTED";
