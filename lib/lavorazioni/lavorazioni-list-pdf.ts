"use client";

import { jsPDF } from "jspdf";
import { comparePrioritaLavorazione } from "@/lib/lavorazioni/priorita-order";
import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  fmtDateIt,
  pdfAdvanceSection,
  drawGestionaleDataSectionTable,
  pdfContentWidth,
} from "@/lib/pdf/core/pdf-base-template";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";

export type LavorazioniInCorsoPdfRow = {
  cliente: string;
  attrezzatura: string;
  identificazione: string;
  stato: string;
  priorita: string;
  prioritaSortKey: string;
  addetto: string;
};

/** Righe targa / matricola / N. scuderia per cella PDF multilinea. */
export function formatIdentificazionePdfCell(targa: string, matricola: string, scuderia: string): string {
  const lines = [targa.trim(), matricola.trim(), scuderia.trim() ? `N. ${scuderia.trim()}` : ""].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "—";
}

function safeText(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t || "—";
}

function buildFileName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `lavorazioni_in_corso_${y}${m}${day}.pdf`;
}

function sortPdfRows(rows: readonly LavorazioniInCorsoPdfRow[]): LavorazioniInCorsoPdfRow[] {
  return [...rows].sort((a, b) => {
    const p = comparePrioritaLavorazione(b.prioritaSortKey, a.prioritaSortKey);
    if (p !== 0) return p;
    return safeText(a.cliente).localeCompare(safeText(b.cliente), "it");
  });
}

/** Larghezze colonna scalate alla larghezza utile pagina (A4 landscape). */
function lavorazioniPdfColumnStyles(contentW: number) {
  const base = [38, 54, 52, 34, 26, 49] as const;
  const sum = base.reduce((acc, w) => acc + w, 0);
  const scale = contentW / sum;
  return {
    0: { cellWidth: base[0] * scale, halign: "left" as const },
    1: { cellWidth: base[1] * scale, halign: "left" as const },
    2: { cellWidth: base[2] * scale, halign: "left" as const, fontSize: 8.5 },
    3: { cellWidth: base[3] * scale, halign: "left" as const },
    4: { cellWidth: base[4] * scale, halign: "left" as const },
    5: { cellWidth: base[5] * scale, halign: "left" as const },
  };
}

/**
 * Export PDF lista lavorazioni in corso in layout A4 landscape.
 */
export function openLavorazioniInCorsoPdfInNewTab(
  rows: readonly LavorazioniInCorsoPdfRow[],
  autore: string,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pdfContentWidth(pageW);
  const nowIso = new Date().toISOString();
  const operatore = autore.trim() || "Operatore";

  let y = drawGestionalePdfHeader(doc, pageW, "LAVORAZIONI IN CORSO", {
    data: fmtDateIt(nowIso),
    operatore,
  });
  y = pdfAdvanceSection(y);

  const ordered = sortPdfRows(rows);
  const body = ordered.map((row) => [
    safeText(row.cliente),
    safeText(row.attrezzatura),
    safeText(row.identificazione),
    safeText(row.stato),
    safeText(row.priorita),
    safeText(row.addetto),
  ]);

  drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    "Elenco",
    ["Cliente", "Attrezzatura", "Identificazione", "Stato", "Priorità", "Addetto"],
    body,
    lavorazioniPdfColumnStyles(contentW),
    { label: "Righe", value: String(ordered.length) },
  );

  drawPdfPageFooters(doc, `Lavorazioni in corso · ${ordered.length} righe`);
  void openPdfBlobInNewTab(doc.output("blob"), buildFileName());
}
