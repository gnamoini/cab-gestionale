import type { ImportFieldDef } from "@/lib/data-import/core/types";
import type { FieldPatternSet } from "@/lib/data-import/core/column-mapper";

export const MAGAZZINO_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "codice", label: "Codice articolo", required: true, example: "ABC-123", description: "Codice OE univoco" },
  { key: "descrizione", label: "Descrizione", required: true, example: "Filtro olio" },
  { key: "marca", label: "Marca", example: "MANN" },
  { key: "quantita", label: "Giacenza", example: "10", description: "Quantità a magazzino" },
  { key: "costo", label: "Prezzo listino / costo", example: "12.50" },
  { key: "prezzo_vendita", label: "Prezzo vendita", example: "18.00" },
  { key: "categoria", label: "Categoria", example: "Filtri" },
  { key: "note", label: "Note", example: "Uso tagliando" },
  { key: "unita_misura", label: "Unità di misura", example: "pz" },
  { key: "scorta_minima", label: "Scorta minima", example: "2" },
  { key: "sconto_percent", label: "Sconto % fornitore", example: "15" },
];

export const MAGAZZINO_FIELD_PATTERNS: FieldPatternSet = {
  codice: [/^cod(ice)?(\s*(oe|fornitore|articolo|parte|ricambio))?$/i, /^part(\s*(no|number))?$/i, /^ref(erence)?$/i, /^sku$/i],
  descrizione: [/^desc(rizione)?$/i, /^description$/i, /^nome$/i, /^articolo$/i, /^designazione$/i],
  marca: [/^marca$/i, /^brand$/i],
  quantita: [/^quant(ità|ita|ity)?$/i, /^giacenza$/i, /^stock$/i, /^q\.?\s*ta$/i],
  costo: [/^prezzo(\s*(listino|unitario|netto))?(\s*eur)?$/i, /^listino$/i, /^costo$/i, /^price$/i],
  prezzo_vendita: [/^prezzo(\s*vendita)?$/i, /^vendita$/i, /^pvp$/i],
  categoria: [/^categoria$/i, /^cat\.?$/i, /^gruppo$/i],
  note: [/^note?$/i, /^osservazioni$/i],
  unita_misura: [/^u\.?\s*m\.?$/i, /^unità(\s*di\s*misura)?$/i, /^um$/i],
  scorta_minima: [/^scorta(\s*min(ima)?)?$/i, /^min(imo)?$/i],
  sconto_percent: [/^sconto(\s*%|\s*percent)?$/i],
};

export type MagazzinoImportRow = {
  rowIndex: number;
  codice: string;
  descrizione: string;
  marca?: string;
  quantita?: number;
  costo?: number;
  prezzo_vendita?: number;
  categoria?: string;
  note?: string;
  unita_misura?: string;
  scorta_minima?: number;
  sconto_percent?: number;
};

export type MagazzinoImportDecision = {
  rowIndex: number;
  action: "skip" | "update" | "replace" | "create";
  row: MagazzinoImportRow;
  duplicateRicambioId?: string;
};
