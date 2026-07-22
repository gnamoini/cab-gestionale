type MagazzinoAuditFailureMeta = {
  error: unknown;
  movementId?: string | null;
  ricambioId?: string | null;
  userId?: string | null;
  source?: string;
};

/** Telemetria audit stock non bloccante (no tabella DB in questa iterazione). */
export function logMagazzinoAuditWriteFailed(meta: MagazzinoAuditFailureMeta): void {
  const err =
    meta.error instanceof Error
      ? { message: meta.error.message, name: meta.error.name }
      : { message: String(meta.error) };
  console.error("[MAGAZZINO_AUDIT_WRITE_FAILED]", {
    event: "MAGAZZINO_AUDIT_WRITE_FAILED",
    error: err,
    movementId: meta.movementId ?? null,
    ricambioId: meta.ricambioId ?? null,
    userId: meta.userId ?? null,
    source: meta.source ?? "unknown",
  });
}
