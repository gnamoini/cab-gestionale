"use client";

import {
  PDF_MARGIN_L,
  PDF_MARGIN_R,
  PDF_SECTION_CONTENT_GAP,
  drawGestionalePdfHeader,
  drawPdfFieldGrid,
  drawPdfPageFooters,
  drawPdfSectionTitle,
  ensurePdfSpace,
  fmtDateIt,
  getAutoTableFinalY,
  pdfAdvanceSection,
  pdfContentWidth,
  pdfTableDefaults,
  type PdfField,
} from "@/lib/pdf/core/pdf-base-template";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { buildSchedaPdfDownloadFileName } from "@/lib/schede/scheda-pdf-filename";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LavorazioneSchedeBundle, SchedaIngressoDoc, SchedaLavorazioniDoc, SchedaRicambiDoc } from "@/types/schede";

function schedaDocumentTitle(titoloScheda: string): string {
  const t = titoloScheda.trim();
  if (!t) return "SCHEDA";
  return t.toUpperCase();
}

function ingressoValueInIdent(identLower: string, value: string): boolean {
  const v = value.trim();
  if (!v || !identLower.trim()) return false;
  return identLower.includes(v.toLowerCase());
}

function ingressoField(label: string, value: string | undefined, identLower: string): PdfField | null {
  const v = value?.trim();
  if (!v || ingressoValueInIdent(identLower, v)) return null;
  return { label, value: v };
}

function drawIdentificazioneMacchinaSection(doc: jsPDF, y: number, pageW: number, text: string): number {
  const idText = text.trim();
  if (!idText) return y;
  y = ensurePdfSpace(doc, y, 22);
  y = drawPdfSectionTitle(doc, y, pageW, "Identificazione macchina");
  y += PDF_SECTION_CONTENT_GAP;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  const idLines = doc.splitTextToSize(idText, pdfContentWidth(pageW)) as string[];
  doc.text(idLines, PDF_MARGIN_L, y);
  return y + idLines.length * 4.5 + PDF_SECTION_CONTENT_GAP;
}

function drawIngressoPdf(
  doc: jsPDF,
  pageW: number,
  startY: number,
  scheda: SchedaIngressoDoc,
  identLower: string,
): number {
  const c = scheda.campi;
  let y = startY;

  const sections: { title: string; fields: PdfField[] }[] = [
    {
      title: "Dati ingresso",
      fields: [
        ingressoField("Data ingresso", c.dataIngresso, identLower),
        ingressoField("Addetto accettazione", c.addettoAccettazione, identLower),
      ].filter((f): f is PdfField => f !== null),
    },
    {
      title: "Dati anagrafici",
      fields: [
        ingressoField("Cliente", c.cliente, identLower),
        ingressoField("Cantiere", c.cantiere, identLower),
        ingressoField("Utilizzatore", c.utilizzatore, identLower),
      ].filter((f): f is PdfField => f !== null),
    },
    {
      title: "Attrezzatura",
      fields: [
        ingressoField("Tipo attrezzatura", c.tipoAttrezzatura, identLower),
        ingressoField("Marca attrezzatura", c.marcaAttrezzatura, identLower),
        ingressoField("Modello attrezzatura", c.modelloAttrezzatura, identLower),
        ingressoField("Matricola", c.matricola, identLower),
        ingressoField("N. scuderia", c.nScuderia, identLower),
        ingressoField("Ore lavoro", c.oreLavoro, identLower),
      ].filter((f): f is PdfField => f !== null),
    },
    {
      title: "Telaio",
      fields: [
        ingressoField("Tipo telaio", c.tipoTelaio, identLower),
        ingressoField("Marca telaio", c.marcaTelaio, identLower),
        ingressoField("Modello telaio", c.modelloTelaio, identLower),
        ingressoField("Targa", c.targa, identLower),
        ingressoField("KM", c.km, identLower),
        ingressoField("Livello carburante", c.livelloCarburante, identLower),
      ].filter((f): f is PdfField => f !== null),
    },
    {
      title: "Note",
      fields: [ingressoField("Descrizione anomalia", c.descrizioneAnomalia, identLower)].filter(
        (f): f is PdfField => f !== null,
      ),
    },
  ];

  for (const section of sections) {
    if (!section.fields.length) continue;
    y = ensurePdfSpace(doc, y, 28);
    y = drawPdfSectionTitle(doc, y, pageW, section.title);
    y = drawPdfFieldGrid(doc, y, pageW, section.fields);
    y = pdfAdvanceSection(y);
  }

  return y;
}

function drawLavorazioniPdf(
  doc: jsPDF,
  pageW: number,
  startY: number,
  scheda: SchedaLavorazioniDoc,
  ident: string,
): number {
  const c = scheda.campi;
  let y = startY;
  const idText = (ident || c.identificazioneMacchina?.trim() || "").trim();
  y = drawIdentificazioneMacchinaSection(doc, y, pageW, idText);

  let oreTotale = 0;
  const body = c.righe.map((r) => {
    for (const a of r.addettiAssegnati ?? []) {
      oreTotale += Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0;
    }
    const add =
      (r.addettiAssegnati ?? [])
        .map((a) => `${a.addetto || "—"} (${String(a.oreImpiegate ?? 0)}h)`)
        .join(", ") || "—";
    return [r.dataLavorazione || "—", r.lavorazioniEffettuate || "—", add];
  });

  y = ensurePdfSpace(doc, y, 26);
  y = drawPdfSectionTitle(doc, y, pageW, "Interventi effettuati");
  y += PDF_SECTION_CONTENT_GAP;
  autoTable(doc, {
    startY: y,
    head: [["Data", "Lavorazioni effettuate", "Addetti (ore)"]],
    body: body.length ? body : [["—", "—", "—"]],
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: "auto" as const },
      2: { cellWidth: 42 },
    },
    ...pdfTableDefaults,
  });
  y = pdfAdvanceSection(getAutoTableFinalY(doc, y + 12));

  y = ensurePdfSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(`Ore totali: ${oreTotale.toFixed(2)}`, PDF_MARGIN_L, y);
  return y + 6;
}

function drawRicambiPdf(
  doc: jsPDF,
  pageW: number,
  startY: number,
  scheda: SchedaRicambiDoc,
  ident: string,
): number {
  const c = scheda.campi;
  let y = startY;
  const idText = (ident || c.identificazioneMacchina?.trim() || "").trim();
  y = drawIdentificazioneMacchinaSection(doc, y, pageW, idText);

  const body = c.righe.map((r) => [
    r.ricambioNome || "—",
    r.codice || "—",
    String(r.quantita ?? "—"),
    r.addetto || "—",
    r.dataUtilizzo || "—",
  ]);

  y = ensurePdfSpace(doc, y, 26);
  y = drawPdfSectionTitle(doc, y, pageW, "Ricambi utilizzati");
  y += PDF_SECTION_CONTENT_GAP;
  autoTable(doc, {
    startY: y,
    head: [["Ricambio", "Codice", "Qtà", "Addetto", "Data"]],
    body: body.length ? body : [["—", "—", "—", "—", "—"]],
    columnStyles: {
      0: { cellWidth: "auto" as const },
      1: { cellWidth: 28 },
      2: { cellWidth: 14, halign: "center" as const },
      3: { cellWidth: 32 },
      4: { cellWidth: 26 },
    },
    ...pdfTableDefaults,
  });
  return getAutoTableFinalY(doc, y + 12);
}

/** Apre un PDF reale (blob) in nuova scheda con layout unificato preventivi/schede. */
export function openSchedaPdfInNewTab(opts: {
  titoloScheda: string;
  identificazioneLine: string;
  bundle: LavorazioneSchedeBundle;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  autore: string;
}): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const ident = opts.identificazioneLine.trim();
  const identLower = ident.toLowerCase();
  const operatore = opts.autore.trim() || opts.doc.updatedBy?.trim() || opts.doc.createdBy?.trim() || "Operatore";
  const docDate = opts.doc.createdAt ? fmtDateIt(opts.doc.createdAt) : fmtDateIt(new Date().toISOString());
  const footerRef = opts.bundle.lavorazioneId.trim() || opts.titoloScheda.trim() || "Scheda";

  let y = drawGestionalePdfHeader(doc, pageW, schedaDocumentTitle(opts.titoloScheda), {
    numero: opts.bundle.lavorazioneId.trim() || undefined,
    data: docDate,
    operatore,
  });
  y = pdfAdvanceSection(y);

  if (opts.doc.tipo === "ingresso" && ident) {
    y = drawIdentificazioneMacchinaSection(doc, y, pageW, ident);
    y = pdfAdvanceSection(y);
  }

  if (opts.doc.tipo === "ingresso") {
    drawIngressoPdf(doc, pageW, y, opts.doc, identLower);
  } else if (opts.doc.tipo === "lavorazioni") {
    drawLavorazioniPdf(doc, pageW, y, opts.doc, ident);
  } else {
    drawRicambiPdf(doc, pageW, y, opts.doc, ident);
  }

  drawPdfPageFooters(doc, footerRef);

  const fileName = buildSchedaPdfDownloadFileName({
    doc: opts.doc,
    lavorazioneId: opts.bundle.lavorazioneId,
    titoloScheda: opts.titoloScheda,
  });
  void openPdfBlobInNewTab(doc.output("blob"), fileName);
}
