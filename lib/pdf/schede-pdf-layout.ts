import type { jsPDF } from "jspdf";
import { addettoRefFromFields, getAddettoDisplayLabel } from "@/lib/lavorazioni/addetto-display";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { PdfField } from "@/lib/pdf/core/pdf-base-template";
import {
  drawGestionaleDataSectionTable,
  drawGestionaleFieldSectionTable,
  pdfFieldFromValue,
} from "@/lib/pdf/gestionale-section-table";
import type {
  LavorazioneSchedeBundle,
  SchedaIngressoDoc,
  SchedaIngressoFields,
  SchedaLavorazioniDoc,
  SchedaRicambiDoc,
} from "@/types/schede";

const CLIENTE_FIELD_LABELS = new Set(["Cliente", "Cantiere", "Utilizzatore", "Richiedente"]);

/** Parse `Label: valore • Label: valore` in righe label|value. */
export function pdfFieldsFromIdentificazioneLine(line: string): PdfField[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const fields: PdfField[] = [];
  for (const segment of trimmed.split(/\s•\s/)) {
    const colonIdx = segment.indexOf(":");
    if (colonIdx <= 0) continue;
    const label = segment.slice(0, colonIdx).trim();
    const value = segment.slice(colonIdx + 1).trim();
    const field = pdfFieldFromValue(label, value);
    if (field) fields.push(field);
  }
  return fields;
}

function buildClienteMezzoFromIngresso(c: SchedaIngressoFields): { cliente: PdfField[]; mezzo: PdfField[] } {
  const field = pdfFieldFromValue;
  return {
    cliente: [field("Cliente", c.cliente), field("Cantiere", c.cantiere), field("Utilizzatore", c.utilizzatore)].filter(
      (f): f is PdfField => f !== null,
    ),
    mezzo: [
      field("Tipo", c.tipoAttrezzatura),
      field("Marca", c.marcaAttrezzatura),
      field("Modello", c.modelloAttrezzatura),
      field("Matricola", c.matricola),
      field("N. scuderia", c.nScuderia),
      field("Targa", c.targa),
    ].filter((f): f is PdfField => f !== null),
  };
}

function splitParsedIdentificazioneFields(fields: PdfField[]): { cliente: PdfField[]; mezzo: PdfField[] } {
  const cliente: PdfField[] = [];
  const mezzo: PdfField[] = [];
  for (const f of fields) {
    if (CLIENTE_FIELD_LABELS.has(f.label)) {
      cliente.push(f);
    } else {
      mezzo.push(f);
    }
  }
  return { cliente, mezzo };
}

export function buildClienteMezzoPdfFields(
  ingresso: SchedaIngressoDoc | null,
  identFallback: string,
): { cliente: PdfField[]; mezzo: PdfField[] } {
  if (ingresso) return buildClienteMezzoFromIngresso(ingresso.campi);
  return splitParsedIdentificazioneFields(pdfFieldsFromIdentificazioneLine(identFallback));
}

function formatAddettiCell(
  addetti: { addetto?: string; addettoId?: string | null; oreImpiegate: number }[],
  records: readonly AddettoRecord[] = [],
): string {
  const lines = (addetti ?? [])
    .map((a) => {
      const label = getAddettoDisplayLabel(
        records,
        addettoRefFromFields({ addettoId: a.addettoId, addettoLegacy: a.addetto }),
      );
      return `${label} (${String(a.oreImpiegate ?? 0)}h)`;
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : "—";
}

export function buildLavorazioniInterventiBody(scheda: SchedaLavorazioniDoc): {
  body: string[][];
  oreTotale: number;
} {
  let oreTotale = 0;
  const body = scheda.campi.righe.map((r) => {
    for (const a of r.addettiAssegnati ?? []) {
      oreTotale += Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0;
    }
    return [r.dataLavorazione || "—", r.lavorazioniEffettuate || "—", formatAddettiCell(r.addettiAssegnati ?? [])];
  });
  return { body, oreTotale };
}

export function buildRicambiArticoliBody(scheda: SchedaRicambiDoc): {
  body: string[][];
  totalePezzi: number;
  numRighe: number;
} {
  let totalePezzi = 0;
  const body = scheda.campi.righe.map((r) => {
    const q = r.quantita;
    if (Number.isFinite(q)) totalePezzi += q;
    return [
      r.ricambioNome || "—",
      r.codice || "—",
      String(r.quantita ?? "—"),
      getAddettoDisplayLabel([], addettoRefFromFields({ addettoId: r.addettoId, addettoLegacy: r.addetto })),
      r.dataUtilizzo || "—",
      r.scaricoMagazzinoApplicato ? "Scaricato" : "—",
    ];
  });
  return { body, totalePezzi, numRighe: scheda.campi.righe.length };
}

export function buildLavorazioniPdfSections(
  scheda: SchedaLavorazioniDoc,
  bundle: LavorazioneSchedeBundle,
  identFallback: string,
) {
  const ident = (identFallback || scheda.campi.identificazioneMacchina?.trim() || "").trim();
  const { cliente, mezzo } = buildClienteMezzoPdfFields(bundle.ingresso, ident);
  const interventi = buildLavorazioniInterventiBody(scheda);
  const riepilogo = [pdfFieldFromValue("Ore totali", interventi.oreTotale.toFixed(2))].filter(
    (f): f is PdfField => f !== null,
  );
  return { cliente, mezzo, interventi, riepilogo };
}

export function buildRicambiPdfSections(
  scheda: SchedaRicambiDoc,
  bundle: LavorazioneSchedeBundle,
  identFallback: string,
) {
  const ident = (identFallback || scheda.campi.identificazioneMacchina?.trim() || "").trim();
  const { cliente, mezzo } = buildClienteMezzoPdfFields(bundle.ingresso, ident);
  const articoli = buildRicambiArticoliBody(scheda);
  const riepilogoFields: PdfField[] = [];
  if (articoli.numRighe > 0) {
    const righeField = pdfFieldFromValue("Righe", String(articoli.numRighe));
    if (righeField) riepilogoFields.push(righeField);
    const pezziField = pdfFieldFromValue("Totale pezzi", String(articoli.totalePezzi));
    if (pezziField) riepilogoFields.push(pezziField);
  }
  return { cliente, mezzo, articoli, riepilogo: riepilogoFields };
}

function drawFieldSections(
  doc: jsPDF,
  startY: number,
  pageW: number,
  sections: { title: string; fields: PdfField[]; multiline?: boolean }[],
): number {
  let y = startY;
  for (const s of sections) {
    if (!s.fields.length) continue;
    y = drawGestionaleFieldSectionTable(doc, y, pageW, s.title, s.fields, s.multiline ? { multiline: true } : undefined);
  }
  return y;
}

/** Corpo PDF scheda lavorazioni — layout table-based (header/footer gestiti dal chiamante). */
export function drawLavorazioniPdfBody(
  doc: jsPDF,
  pageW: number,
  startY: number,
  scheda: SchedaLavorazioniDoc,
  bundle: LavorazioneSchedeBundle,
  identFallback: string,
): number {
  const sections = buildLavorazioniPdfSections(scheda, bundle, identFallback);
  let y = drawFieldSections(doc, startY, pageW, [
    { title: "Cliente", fields: sections.cliente },
    { title: "Mezzo", fields: sections.mezzo },
  ]);

  const { body } = sections.interventi;
  y = drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    "Interventi effettuati",
    ["Data", "Lavorazioni effettuate", "Addetti (ore)"],
    body.length ? body : [["—", "—", "—"]],
    {
      0: { cellWidth: 26 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 42 },
    },
  );

  if (sections.riepilogo.length) {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Riepilogo", sections.riepilogo);
  }

  return y;
}

/** Corpo PDF scheda ricambi — layout table-based (header/footer gestiti dal chiamante). */
export function drawRicambiPdfBody(
  doc: jsPDF,
  pageW: number,
  startY: number,
  scheda: SchedaRicambiDoc,
  bundle: LavorazioneSchedeBundle,
  identFallback: string,
): number {
  const sections = buildRicambiPdfSections(scheda, bundle, identFallback);
  let y = drawFieldSections(doc, startY, pageW, [
    { title: "Cliente", fields: sections.cliente },
    { title: "Mezzo", fields: sections.mezzo },
  ]);

  const { body } = sections.articoli;
  y = drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    "Articoli utilizzati",
    ["Ricambio", "Codice", "Qtà", "Addetto", "Data", "Magazzino"],
    body.length ? body : [["—", "—", "—", "—", "—", "—"]],
    {
      0: { cellWidth: "auto" },
      1: { cellWidth: 24 },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 28 },
      4: { cellWidth: 24 },
      5: { cellWidth: 22, halign: "center" },
    },
  );

  if (sections.riepilogo.length) {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Riepilogo", sections.riepilogo);
  }

  return y;
}
