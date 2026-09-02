import {
  addettoDisplayName,
  findAddettoById,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import {
  PREVENTIVO_CLIENTE_LABELS,
  PREVENTIVO_WORKFLOW_LABELS,
  preventivoClienteLabel,
  preventivoWorkflowLabel,
} from "@/lib/preventivi/preventivo-status-ui";
import {
  preventivoTipoDocumentoLabel,
  type PreventivoTipoDocumento,
} from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import {
  buildSearchDocumentFromFieldEntries,
  type FieldSearchEntry,
} from "@/lib/search/field-token";

/** Versione contract — incrementare se si aggiungono source; parity test legge la migration. */
export const PREVENTIVO_SEARCH_DOCUMENT_CONTRACT_VERSION = 1;

export type PreventivoSearchMagazzinoSnapshot = {
  codice: string;
  nome: string;
};

export type PreventivoSearchDocumentContext = {
  addettiRecords?: readonly AddettoRecord[];
  lavorazioneCodice?: string | null;
  lavorazioneNote?: string | null;
  /** Snapshot magazzino per righe con ricambioId (allineato al JOIN SQL). */
  ricambiMagazzinoById?: ReadonlyMap<string, PreventivoSearchMagazzinoSnapshot>;
};

/** Manifest SSOT: ogni source deve avere estrazione TS e pattern nella migration SQL. */
export const PREVENTIVO_SEARCH_DOCUMENT_SOURCES = [
  { id: "numero", sqlPattern: "dettagli->>'numero'" },
  { id: "tipo_documento", sqlPattern: "tipoDocumento" },
  { id: "stato_workflow", sqlPattern: "stato_workflow" },
  { id: "cliente", sqlPattern: "p.cliente" },
  { id: "cantiere", sqlPattern: "dettagli->>'cantiere'" },
  { id: "utilizzatore", sqlPattern: "dettagli->>'utilizzatore'" },
  { id: "macchina_riassunto", sqlPattern: "macchinaRiassunto" },
  { id: "descrizione_lavorazioni_cliente", sqlPattern: "descrizioneLavorazioniCliente" },
  { id: "descrizione_lavorazioni_tecnica", sqlPattern: "descrizioneLavorazioniTecnicaSorgente" },
  { id: "descrizione_generata_auto", sqlPattern: "descrizioneGenerataAuto" },
  { id: "note_finali", sqlPattern: "noteFinali" },
  { id: "richiedente", sqlPattern: "richiedente" },
  { id: "righe_ricambi_snapshot", sqlPattern: "righeRicambi" },
  { id: "righe_ricambi_magazzino", sqlPattern: "magazzino_ricambi" },
  { id: "righe_addetti_legacy", sqlPattern: "addettoLegacy" },
  { id: "righe_addetti_resolved", sqlPattern: "dipendentiRecords" },
  { id: "lavorazione_codice", sqlPattern: "l.codice" },
  { id: "lavorazione_note", sqlPattern: "l.note" },
  { id: "mezzo_targa", sqlPattern: "m.targa" },
  { id: "mezzo_telaio", sqlPattern: "marca_telaio" },
  { id: "data_importi", sqlPattern: "created_at" },
] as const;

function pushPart(parts: string[], value: string | null | undefined): void {
  const t = typeof value === "string" ? value.trim() : "";
  if (t) parts.push(t);
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

function collectRicambiParts(
  row: PreventivoRecord,
  ctx: PreventivoSearchDocumentContext | undefined,
  parts: string[],
): void {
  for (const riga of row.righeRicambi ?? []) {
    pushPart(parts, riga.codiceOE);
    pushPart(parts, riga.descrizione);
    const rid = riga.ricambioId?.trim();
    if (!rid) continue;
    const mag = ctx?.ricambiMagazzinoById?.get(rid);
    if (mag) {
      pushPart(parts, mag.codice);
      pushPart(parts, mag.nome);
    }
  }
}

function collectAddettiParts(
  row: PreventivoRecord,
  ctx: PreventivoSearchDocumentContext | undefined,
  parts: string[],
): void {
  const records = ctx?.addettiRecords ?? [];
  for (const riga of row.manodopera?.righeAddetti ?? []) {
    pushPart(parts, riga.addettoLegacy);
    const id = riga.addettoId?.trim();
    if (!id) continue;
    const rec = findAddettoById(records, id);
    if (rec) pushPart(parts, addettoDisplayName(rec));
  }
}

function collectTipoDocumentoParts(tipo: PreventivoTipoDocumento, parts: string[]): void {
  pushPart(parts, tipo);
  pushPart(parts, preventivoTipoDocumentoLabel(tipo));
  pushPart(parts, preventivoTipoDocumentoLabel(tipo, "short"));
  pushPart(parts, preventivoTipoDocumentoLabel(tipo, "chip"));
}

function collectStatoParts(row: PreventivoRecord, parts: string[]): void {
  pushPart(parts, row.statoWorkflow);
  pushPart(parts, preventivoWorkflowLabel(row.statoWorkflow));
  pushPart(parts, PREVENTIVO_WORKFLOW_LABELS[row.statoWorkflow]);
  if (row.statoCliente) {
    pushPart(parts, row.statoCliente);
    pushPart(parts, preventivoClienteLabel(row.statoCliente));
    pushPart(parts, PREVENTIVO_CLIENTE_LABELS[row.statoCliente]);
  }
}

/** Parti grezze indicizzate — usate da test parity e debug. */
export function collectPreventivoSearchRawParts(
  row: PreventivoRecord,
  ctx?: PreventivoSearchDocumentContext,
): string[] {
  const parts: string[] = [];
  pushPart(parts, row.numero);
  collectTipoDocumentoParts(row.tipoDocumento, parts);
  collectStatoParts(row, parts);
  pushPart(parts, row.cliente);
  pushPart(parts, row.cantiere);
  pushPart(parts, row.utilizzatore);
  pushPart(parts, row.macchinaRiassunto);
  pushPart(parts, row.targa);
  pushPart(parts, row.matricola);
  pushPart(parts, row.nScuderia);
  pushPart(parts, row.marcaAttrezzatura);
  pushPart(parts, row.modelloAttrezzatura);
  pushPart(parts, row.marcaTelaio);
  pushPart(parts, row.modelloTelaio);
  pushPart(parts, row.tipoTelaio);
  pushPart(parts, row.tipoAttrezzatura);
  pushPart(parts, row.km);
  pushPart(parts, row.attrezzaturaMarca);
  pushPart(parts, row.attrezzaturaModello);
  pushPart(parts, row.attrezzaturaMatricola);
  pushPart(parts, row.lavorazioneId);
  pushPart(parts, ctx?.lavorazioneCodice);
  pushPart(parts, ctx?.lavorazioneNote);
  pushPart(parts, row.descrizioneLavorazioniCliente);
  pushPart(parts, row.descrizioneLavorazioniTecnicaSorgente);
  pushPart(parts, row.descrizioneGenerataAuto);
  pushPart(parts, row.sanificazioneDescrizione);
  pushPart(parts, row.collaudoDescrizione);
  pushPart(parts, row.noteFinali);
  pushPart(parts, row.richiedente);
  pushPart(parts, row.livelloCarburante);
  pushPart(parts, row.dataCreazione);
  pushPart(parts, formatMoney(row.totaleFinale));
  pushPart(parts, formatMoney(row.totaleRicambi));
  pushPart(parts, formatMoney(row.totaleManodopera));
  collectRicambiParts(row, ctx, parts);
  collectAddettiParts(row, ctx, parts);
  return parts;
}

export function collectPreventivoSearchFieldEntries(
  row: PreventivoRecord,
  ctx?: PreventivoSearchDocumentContext,
): FieldSearchEntry[] {
  const entries: FieldSearchEntry[] = [
    { kind: "document", value: row.numero },
    { kind: "customer", value: row.cliente },
    { kind: "customer", value: row.cantiere },
    { kind: "customer", value: row.utilizzatore },
    { kind: "description", value: row.macchinaRiassunto },
    { kind: "plate", value: row.targa },
    { kind: "document", value: row.matricola },
    { kind: "document", value: row.nScuderia },
    { kind: "brand", value: row.marcaAttrezzatura },
    { kind: "model", value: row.modelloAttrezzatura },
    { kind: "brand", value: row.marcaTelaio },
    { kind: "model", value: row.modelloTelaio },
    { kind: "code", value: row.lavorazioneId },
    { kind: "code", value: ctx?.lavorazioneCodice },
    { kind: "description", value: row.descrizioneLavorazioniCliente },
    { kind: "description", value: row.descrizioneLavorazioniTecnicaSorgente },
    { kind: "note", value: row.noteFinali },
    { kind: "operator", value: row.richiedente },
  ];
  for (const riga of row.righeRicambi ?? []) {
    entries.push({ kind: "code", value: riga.codiceOE });
    entries.push({ kind: "description", value: riga.descrizione });
    const rid = riga.ricambioId?.trim();
    if (!rid) continue;
    const mag = ctx?.ricambiMagazzinoById?.get(rid);
    if (mag) {
      entries.push({ kind: "code", value: mag.codice });
      entries.push({ kind: "description", value: mag.nome });
    }
  }
  for (const riga of row.manodopera?.righeAddetti ?? []) {
    entries.push({ kind: "operator", value: riga.addettoLegacy });
    const id = riga.addettoId?.trim();
    if (!id) continue;
    const rec = findAddettoById(ctx?.addettiRecords ?? [], id);
    if (rec) entries.push({ kind: "operator", value: addettoDisplayName(rec) });
  }
  return entries;
}

export function collectPreventivoSearchExtraParts(
  row: PreventivoRecord,
  ctx?: PreventivoSearchDocumentContext,
): string[] {
  const parts: string[] = [];
  collectTipoDocumentoParts(row.tipoDocumento, parts);
  collectStatoParts(row, parts);
  pushPart(parts, row.tipoAttrezzatura);
  pushPart(parts, row.tipoTelaio);
  pushPart(parts, row.km);
  pushPart(parts, row.attrezzaturaMarca);
  pushPart(parts, row.attrezzaturaModello);
  pushPart(parts, row.attrezzaturaMatricola);
  pushPart(parts, row.descrizioneGenerataAuto);
  pushPart(parts, row.sanificazioneDescrizione);
  pushPart(parts, row.collaudoDescrizione);
  pushPart(parts, row.livelloCarburante);
  pushPart(parts, ctx?.lavorazioneNote);
  pushPart(parts, row.dataCreazione);
  pushPart(parts, formatMoney(row.totaleFinale));
  pushPart(parts, formatMoney(row.totaleRicambi));
  pushPart(parts, formatMoney(row.totaleManodopera));
  return parts;
}

export function buildPreventivoSearchDocument(
  row: PreventivoRecord,
  ctx?: PreventivoSearchDocumentContext,
): string {
  return buildSearchDocumentFromFieldEntries(
    collectPreventivoSearchFieldEntries(row, ctx),
    collectPreventivoSearchExtraParts(row, ctx),
  );
}
