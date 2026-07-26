/** Tabelle il cui cambio impatta il portale clienti (allineate a Realtime + broadcast). */
export const CLIENT_PORTAL_SYNC_TABLES = [
  "lavorazioni",
  "pdf_artifacts",
  "document_access_tokens",
  "scheda_lavorazione",
  "preventivi",
  "mezzi",
  "log_modifiche",
  "documenti",
] as const;

export type ClientPortalSyncTable = (typeof CLIENT_PORTAL_SYNC_TABLES)[number];

export function isClientPortalSyncTable(table: string): table is ClientPortalSyncTable {
  return (CLIENT_PORTAL_SYNC_TABLES as readonly string[]).includes(table);
}
