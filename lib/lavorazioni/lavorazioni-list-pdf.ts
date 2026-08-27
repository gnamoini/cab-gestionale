"use client";

import { openPdfArtifactFromUserClick } from "@/lib/pdf/request-pdf-artifact";

export type LavorazioniInCorsoPdfRow = {
  cliente: string;
  attrezzatura: string;
  identificazione: string;
  stato: string;
  priorita: string;
  prioritaSortKey: string;
  addetto: string;
};

export { formatIdentificazionePdfCell } from "@/lib/lavorazioni/lavorazioni-pdf-format";

/**
 * Export PDF lista lavorazioni in corso — server artifact (DTO + storage cache).
 * I parametri `rows` / `autore` sono ignorati: i dati sono caricati lato server.
 */
export function openLavorazioniInCorsoPdfInNewTab(
  _rows?: readonly LavorazioniInCorsoPdfRow[],
  _autore?: string,
): void {
  openPdfArtifactFromUserClick("lavorazioni-in-corso");
}
