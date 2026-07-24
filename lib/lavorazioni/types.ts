/** Modulo Lavorazioni — tipi dedicati (non dipendono dal vecchio union StatoLavorazione). */

export type PrioritaLav = "urgente" | "alta" | "media" | "bassa";

export interface StatoLavorazioneConfig {
  id: string;
  label: string;
  /** Colore badge / pill (#rrggbb). Opzionale: se assente si usa il tema predefinito per id. */
  color?: string;
  /** @deprecated Derivato da id «completata» — non configurabile in UI. */
  closed?: boolean;
}

/** Record in tabella principale (non archiviato). */
export interface LavorazioneAttiva {
  id: string;
  /** Codice umano display (es. 26-0001). */
  codice?: string | null;
  macchina: string;
  targa: string;
  matricola: string;
  /** N. scuderia / postazione flotta (opzionale). */
  nScuderia: string;
  cliente: string;
  utilizzatore: string;
  /** Cantiere / commessa (opzionale). */
  cantiere: string;
  statoId: string;
  priorita: PrioritaLav;
  addetto: string;
  note: string;
  dataIngresso: string;
  /** Impostata quando si passa a stato Completata (o in fase di archiviazione). */
  dataCompletamento: string | null;
}

export interface LavorazioneArchiviata {
  id: string;
  /** Codice umano display (es. 26-0001). */
  codice?: string | null;
  /** FK mezzo in anagrafica, se presente in archivio. */
  mezzoId?: string | null;
  macchina: string;
  targa: string;
  matricola: string;
  /** N. scuderia / postazione flotta (opzionale). */
  nScuderia: string;
  cliente: string;
  utilizzatore: string;
  cantiere: string;
  addetto: string;
  note: string;
  statoFinaleId: string;
  prioritaFinale: PrioritaLav;
  dataIngresso: string;
  dataCompletamento: string;
  meseCompletamento: string;
}

export type SortKeyLavorazione =
  | "macchina"
  | "cliente"
  | "note"
  | "stato"
  | "priorita"
  | "addetto";

export type SortPhaseLav = "asc" | "desc" | "natural";

export type SortKeyStorico =
  | "macchina"
  | "mezzoIdent"
  | "cliente"
  | "addetto"
  | "dataIngresso"
  | "dataCompletamento"
  | "oreTotali";
