/** Map DB/RPC fiscal identity conflicts to UX messages (FASE 5 §26). */

export const FISCAL_IDENTITY_CONFLICT_MESSAGE =
  "Questo identificativo fiscale è già associato a un'altra anagrafica. Verificare i dati prima di procedere.";

export function mapFiscalConflictError(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (
    msg.includes("unique_violation") ||
    msg.includes("già associato") ||
    msg.includes("already associated") ||
    msg.includes("idx_clienti_anagrafiche_piva_uq") ||
    msg.includes("idx_clienti_anagrafiche_cf_uq") ||
    msg.includes("idx_fornitori_anagrafiche_piva_uq") ||
    msg.includes("idx_fornitori_anagrafiche_cf_uq")
  ) {
    return FISCAL_IDENTITY_CONFLICT_MESSAGE;
  }
  return null;
}
