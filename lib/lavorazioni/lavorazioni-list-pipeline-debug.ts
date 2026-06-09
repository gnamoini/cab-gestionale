/** Dev-only: traccia fetch lista lavorazioni (gestionale + portale). */
export type LavorazioniListPipelineDebugPayload = {
  surface: "fetch" | "gestionale" | "client_portal";
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
};

export function logLavorazioniListPipelineDebug(payload: LavorazioniListPipelineDebugPayload): void {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[lavorazioni-pipeline]", payload);
}
