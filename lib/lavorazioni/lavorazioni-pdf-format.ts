function pdfSecondaryLine(value: string): string | null {
  const t = value.trim();
  return t && t !== "—" ? t : null;
}

/** Cliente (utilizzatore) + cantiere su seconda riga se presente. */
export function formatClientePdfCell(cliente: string, cantiere: string, utilizzatore: string): string {
  const clienteBase = cliente.trim() || "—";
  const util = pdfSecondaryLine(utilizzatore);
  const headline = util ? `${clienteBase} (${util})` : clienteBase;
  const cant = pdfSecondaryLine(cantiere);
  return cant ? `${headline}\n${cant}` : headline;
}

/** Righe targa / matricola / scuderia per cella PDF multilinea (senza dipendenza jspdf). */
export function formatIdentificazionePdfCell(targa: string, matricola: string, scuderia: string): string {
  const lines = [
    targa.trim() ? `Targa: ${targa.trim()}` : "",
    matricola.trim() ? `Matr.: ${matricola.trim()}` : "",
    scuderia.trim() ? `Scud.: ${scuderia.trim()}` : "",
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "";
}
