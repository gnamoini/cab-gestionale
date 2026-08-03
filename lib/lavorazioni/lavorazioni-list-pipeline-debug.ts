/** Dev-only: traccia fetch lista lavorazioni (gestionale + portale) e sync pipeline. */
export type LavorazioniListPipelineDebugPayload = {
  surface: "fetch" | "gestionale" | "client_portal";
  phase?: string;
  correlationId?: string | null;
  rawInCorso?: number;
  rawArchivio?: number;
  filteredInCorso?: number;
  filteredArchivio?: number;
  archivedFilter?: boolean | null;
  clienteRefScope?: string | null;
  userId?: string | null;
  queryError?: string | null;
  guardOk?: boolean;
  profileJoinFallback?: boolean;
  queryKey?: readonly unknown[];
  queryKeyRegistered?: readonly unknown[];
  queryKeyInvalidated?: readonly unknown[];
  queryKeyRefetched?: readonly unknown[];
  tables?: string[];
  source?: string;
  entityId?: string;
  remoteVersion?: number | string;
};

export function logLavorazioniListPipelineDebug(payload: LavorazioniListPipelineDebugPayload): void {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[lavorazioni-pipeline]", payload);
}

export function logClientPortalSyncPipelineDebug(
  payload: Omit<LavorazioniListPipelineDebugPayload, "surface"> & { phase: string },
): void {
  logLavorazioniListPipelineDebug({ ...payload, surface: "client_portal" });
}
