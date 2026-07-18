/**
 * Apply lock abstraction — target condiviso per import consumers (DDT, document-capture, ordini).
 *
 * ponytail: v1 DDT usa lock RPC esistente (`FOR UPDATE` in inventory_receiving_apply).
 * Estrazione unificata DB in P2 quando capture refactor è pianificato.
 */

export type ImportApplyEntityType = "inventory_document" | "document_capture" | "ordine_fornitore";

export type ImportApplyLockHandle = {
  entityType: ImportApplyEntityType;
  entityId: string;
  acquiredAt: number;
};

/** Guard applicativo: rifiuta apply se documento già in stato terminale. */
export function assertApplyAllowed(documentStatus: string): void {
  if (documentStatus === "APPLIED") {
    throw new Error("Documento già applicato");
  }
}

export function createApplyLockHandle(
  entityType: ImportApplyEntityType,
  entityId: string,
): ImportApplyLockHandle {
  return { entityType, entityId, acquiredAt: Date.now() };
}
