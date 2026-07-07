/** Dev-only trace per audit membership archivio (Fase 0 piano v2). */
export type LavorazioniArchiveMembershipDebugPayload = {
  event: "optimistic_apply" | "optimistic_rollback" | "reconcile" | "invariant_violation";
  lavorazioneId: string;
  archived?: boolean | null;
  updatedAt?: string | null;
  queryKey?: readonly unknown[];
  listKind?: "list" | "list-v2" | "unknown";
  listArchived?: boolean | null;
  note?: string;
};

export function isLavorazioniArchiveTraceEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function logLavorazioniArchiveMembershipDebug(
  payload: LavorazioniArchiveMembershipDebugPayload,
): void {
  if (!isLavorazioniArchiveTraceEnabled()) return;
  console.debug("[lavorazioni-archive-membership]", {
    at: new Date().toISOString(),
    ...payload,
  });
}
