import type { ImportFieldDef } from "@/lib/data-import/core/types";
import type { FieldPatternSet } from "@/lib/data-import/core/column-mapper";

export const CLIENTI_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "nome_display", label: "Ragione sociale / Nome", required: true, example: "Rossi S.r.l." },
  { key: "ragione_sociale", label: "Ragione sociale completa", example: "Rossi S.r.l." },
  { key: "partita_iva", label: "Partita IVA", example: "12345678901" },
  { key: "codice_fiscale", label: "Codice fiscale", example: "RSSMRA80A01H501Z" },
  { key: "codice_destinatario", label: "Codice destinatario SDI", example: "ABCDEFG" },
  { key: "pec", label: "PEC", example: "rossi@pec.it" },
  { key: "email", label: "Email", example: "info@rossi.it" },
  { key: "telefono", label: "Telefono", example: "+39 02 1234567" },
  { key: "note", label: "Note", example: "Cliente preferenziale" },
  { key: "sede_legale_via", label: "Sede legale — Via", example: "Via Roma" },
  { key: "sede_legale_civico", label: "Sede legale — Civico", example: "10" },
  { key: "sede_legale_cap", label: "Sede legale — CAP", example: "20100" },
  { key: "sede_legale_citta", label: "Sede legale — Città", example: "Milano" },
  { key: "sede_legale_provincia", label: "Sede legale — Prov.", example: "MI" },
  { key: "sede_operativa_via", label: "Sede operativa — Via", example: "Via Verdi" },
  { key: "sede_operativa_cap", label: "Sede operativa — CAP", example: "20100" },
  { key: "sede_operativa_citta", label: "Sede operativa — Città", example: "Milano" },
  { key: "sconto_ricambi", label: "Sconto ricambi %", example: "10" },
];

export const CLIENTI_FIELD_PATTERNS: FieldPatternSet = {
  nome_display: [/^ragione(\s*sociale)?$/i, /^cliente$/i, /^nome(\s*display)?$/i, /^denominazione$/i],
  ragione_sociale: [/^ragione(\s*sociale(\s*completa)?)?$/i],
  partita_iva: [/^p\.?\s*iva$/i, /^partita(\s*iva)?$/i, /^vat$/i],
  codice_fiscale: [/^cod(ice)?(\s*fiscale)?$/i, /^c\.?\s*f\.?$/i],
  codice_destinatario: [/^cod(ice)?(\s*destinatario)?$/i, /^sdi$/i],
  pec: [/^pec$/i],
  email: [/^e-?mail$/i, /^mail$/i],
  telefono: [/^tel(efono)?$/i, /^cell(ulare)?$/i, /^phone$/i],
  note: [/^note?$/i],
  sede_legale_via: [/^sede(\s*legale)?(\s*via)?$/i, /^indirizzo(\s*legale)?$/i, /^via(\s*legale)?$/i],
  sede_legale_cap: [/^cap(\s*legale)?$/i],
  sede_legale_citta: [/^città(\s*legale)?$/i, /^comune(\s*legale)?$/i],
  sede_operativa_via: [/^sede(\s*operativa)?(\s*via)?$/i, /^via(\s*operativa)?$/i],
  sede_operativa_cap: [/^cap(\s*operativa)?$/i],
  sede_operativa_citta: [/^città(\s*operativa)?$/i],
};

export type ClientiImportRow = {
  rowIndex: number;
  nomeDisplay: string;
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  codiceDestinatario?: string;
  pec?: string;
  email?: string;
  telefono?: string;
  note?: string;
  sedeLegale?: { via?: string; civico?: string; cap?: string; citta?: string; provincia?: string };
  sedeOperativa?: { via?: string; cap?: string; citta?: string };
  scontoRicambi?: number;
};

export type ClientiImportDecision = {
  rowIndex: number;
  action: "skip" | "update" | "create";
  row: ClientiImportRow;
  duplicateClienteId?: string;
  duplicateMatchKey?: string;
};
