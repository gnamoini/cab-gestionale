import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import {
  drawGestionaleDataSectionTable,
  padPdfFieldsToEqualRows,
} from "@/lib/pdf/gestionale-section-table";
import {
  PDF_HEADER_BRAND_BLOCK_MM,
  PDF_HEADER_BRAND_TITLE_GAP_MM,
  PDF_HEADER_CONTENT_GAP_MM,
  PDF_MARGIN_TOP,
  PDF_PREVENTIVO_IVA_PERCENT,
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  measureGestionalePdfHeaderEndY,
  pdfAdvanceAfterDocumentHeader,

  pdfContentWidth,
} from "@/lib/pdf/core/pdf-base-template";
import { drawPreventivoPdfBody } from "@/lib/pdf/preventivo-pdf-body";
import type { PreventivoRigaOutput } from "@/lib/preventivi/preventivi-struttura";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** PNG 1×1 px — valido per jsPDF addImage in Node. */
const MOCK_LOGO_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAD0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const basePreventivo = {
  id: "prev-test",
  numero: "P-2026-001",
  dataCreazione: "2026-06-01T10:00:00.000Z",
  aggiornatoAt: "2026-06-01T10:00:00.000Z",
  stato: "bozza",
  tipoDocumento: "preventivo",
  lavorazioneId: "lav-1",
  lavorazioneOrigine: "attiva",
  cliente: "Cliente Test",
  cantiere: "Cantiere A",
  utilizzatore: "Mario Rossi",
  macchinaRiassunto: "CAT 320",
  targa: "AA111BB",
  matricola: "MAT-001",
  nScuderia: "12",
  marcaAttrezzatura: "CAT",
  modelloAttrezzatura: "320",
  totaleRicambi: 100,
  totaleManodopera: 200,
  totaleFinale: 300,
  totaleSmaltimento: 0,
  descrizioneLavorazioniCliente: "",
  noteFinali: "",
} as PreventivoRecord;

function buildPreventivoDoc(
  p: PreventivoRecord,
  righe: PreventivoRigaOutput[],
  logoDataUrl: string | null,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const totaleNetto = p.totaleFinale;
  const importoIva = Math.round(totaleNetto * (PDF_PREVENTIVO_IVA_PERCENT / 100) * 100) / 100;
  const totaleConIva = Math.round((totaleNetto + importoIva) * 100) / 100;

  const y = pdfAdvanceAfterDocumentHeader(
    drawGestionalePdfHeader(doc, pageW, "PREVENTIVO", {
      numero: p.numero,
      data: "01/06/2026",
      operatore: "Test",
      logoDataUrl,
    }),
  );
  drawPreventivoPdfBody(doc, pageW, y, p, righe, {
    totaleRicambi: p.totaleRicambi,
    totaleManodopera: p.totaleManodopera,
    totaleSmaltimento: p.totaleSmaltimento ?? 0,
    totaleNetto,
    importoIva,
    totaleConIva,
    ivaPercent: PDF_PREVENTIVO_IVA_PERCENT,
  });
  drawPdfPageFooters(doc, p.numero);
  return doc;
}

function buildLavorazioniListDoc(rowCount: number, logoDataUrl: string | null): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pdfContentWidth(pageW);

  let y = drawGestionalePdfHeader(doc, pageW, "LAVORAZIONI IN CORSO", {
    data: "07/06/2026",
    metaDivider: false,
    logoDataUrl,
  });
  y = pdfAdvanceAfterDocumentHeader(y);

  const body = Array.from({ length: rowCount }, (_, i) => [
    `Cliente ${i + 1}`,
    "Attrezzatura",
    "ID-001",
    "In corso",
    "Alta",
    "Addetto",
  ]);

  const base = [38, 54, 52, 34, 26, 49] as const;
  const sum = base.reduce((acc, w) => acc + w, 0);
  const scale = contentW / sum;

  drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    "TABELLA LAVORAZIONI",
    ["Cliente", "Attrezzatura", "Identificazione", "Stato", "Priorità", "Addetto"],
    body,
    {
      0: { cellWidth: base[0] * scale, halign: "left" },
      1: { cellWidth: base[1] * scale, halign: "left" },
      2: { cellWidth: base[2] * scale, halign: "left", fontSize: 8.5 },
      3: { cellWidth: base[3] * scale, halign: "left" },
      4: { cellWidth: base[4] * scale, halign: "left" },
      5: { cellWidth: base[5] * scale, halign: "left" },
    },
  );

  drawPdfPageFooters(doc, "LAVORAZIONI IN CORSO");
  return doc;
}

// --- Header height: logo vs testo fallback stesso Y titolo documento ---
const pageWPortrait = new jsPDF().internal.pageSize.getWidth();
const meta = { numero: "1", data: "01/06/2026", operatore: "Op" };

const yTextOnly = measureGestionalePdfHeaderEndY(pageWPortrait, "PREVENTIVO", meta);
const yWithLogo = measureGestionalePdfHeaderEndY(pageWPortrait, "PREVENTIVO", {
  ...meta,
  logoDataUrl: MOCK_LOGO_DATA_URL,
});
const yNoLogoExplicit = measureGestionalePdfHeaderEndY(pageWPortrait, "PREVENTIVO", {
  ...meta,
  logoDataUrl: null,
});

assert.equal(yWithLogo, yTextOnly, "header con logo deve avere stesso Y finale del fallback testuale");
assert.equal(yNoLogoExplicit, yTextOnly, "header senza logo usa fallback testuale con stesso Y");

const yMetaDividerFalse = measureGestionalePdfHeaderEndY(pageWPortrait, "TABELLA PRESENZE", {
  logoDataUrl: MOCK_LOGO_DATA_URL,
  metaDivider: false,
});
const yTitleOnly =
  PDF_MARGIN_TOP +
  PDF_HEADER_BRAND_BLOCK_MM +
  PDF_HEADER_BRAND_TITLE_GAP_MM +
  6 +
  PDF_HEADER_CONTENT_GAP_MM;
assert.equal(yMetaDividerFalse, yTitleOnly, "header senza metadati termina con gap contenuto, senza rule");

const brandBlockEnd = PDF_MARGIN_TOP + PDF_HEADER_BRAND_BLOCK_MM;
const docTitleBaselineY = brandBlockEnd + PDF_HEADER_BRAND_TITLE_GAP_MM;
const logoBottomY = brandBlockEnd;
const probeDoc = new jsPDF();
drawGestionalePdfHeader(probeDoc, pageWPortrait, "PREVENTIVO", {
  ...meta,
  logoDataUrl: MOCK_LOGO_DATA_URL,
});
assert.ok(yWithLogo > docTitleBaselineY, "Y header include titolo documento sotto il blocco brand");
assert.ok(
  docTitleBaselineY >= logoBottomY + 3,
  "baseline titolo documento deve stare almeno 3mm sotto il fondo logo",
);

// --- Paginazione: logo ON vs OFF identica ---
const smallRighe: PreventivoRigaOutput[] = [
  {
    sezione: "lavorazioni",
    ordine: 1,
    descrizione: "Revisione",
    quantita: 1,
    prezzoUnitario: 0,
    totale: 0,
  },
];

const mediumRighe: PreventivoRigaOutput[] = Array.from({ length: 12 }, (_, i) => ({
  sezione: "ricambi" as const,
  ordine: i + 1,
  riga: {
    id: `r-${i}`,
    ricambioId: null,
    codiceOE: `R${i}`,
    descrizione: `Ricambio ${i + 1}`,
    quantita: 1,
    prezzoUnitario: 10 + i,
    scontoPercent: 0,
  },
}));

const largeRighe: PreventivoRigaOutput[] = Array.from({ length: 40 }, (_, i) => ({
  sezione: "ricambi" as const,
  ordine: i + 1,
  riga: {
    id: `r-${i}`,
    ricambioId: null,
    codiceOE: `C${String(i).padStart(4, "0")}`,
    descrizione: `Componente lunga descrizione ${i + 1} per stress test impaginazione PDF`,
    quantita: 2,
    prezzoUnitario: 25,
    scontoPercent: 5,
  },
}));

function assertSamePageCount(
  label: string,
  build: (logo: string | null) => jsPDF,
): void {
  const withLogo = build(MOCK_LOGO_DATA_URL).getNumberOfPages();
  const textOnly = build(null).getNumberOfPages();
  assert.equal(withLogo, textOnly, `${label}: page count logo=${withLogo} text=${textOnly}`);
}

assertSamePageCount("preventivo piccolo", (logo) => buildPreventivoDoc(basePreventivo, smallRighe, logo));
assertSamePageCount("preventivo medio", (logo) =>
  buildPreventivoDoc({ ...basePreventivo, totaleFinale: 1200, totaleRicambi: 800 }, mediumRighe, logo),
);
assertSamePageCount("preventivo grande", (logo) =>
  buildPreventivoDoc({ ...basePreventivo, totaleFinale: 4000, totaleRicambi: 3500 }, largeRighe, logo),
);
assertSamePageCount("lavorazioni lista 55 righe", (logo) => buildLavorazioniListDoc(55, logo));
assertSamePageCount("lavorazioni lista 8 righe", (logo) => buildLavorazioniListDoc(8, logo));

// padPdfFieldsToEqualRows smoke (import usato da body)
const padded = padPdfFieldsToEqualRows([{ label: "A", value: "1" }], [{ label: "B", value: "2" }]);
assert.equal(padded.left.length, padded.right.length);

console.log("pdf-header-branding.test.ts: all assertions passed");
