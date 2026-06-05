/** Righe targa / matricola / N. scuderia per cella PDF multilinea (senza dipendenza jspdf). */
export function formatIdentificazionePdfCell(targa: string, matricola: string, scuderia: string): string {
  const lines = [targa.trim(), matricola.trim(), scuderia.trim() ? `N. ${scuderia.trim()}` : ""].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "—";
}
