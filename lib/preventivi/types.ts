export type PreventivoStato = "bozza" | "inviato" | "approvato" | "rifiutato" | "convertito";

export type PreventivoLavorazioneOrigine = "attiva" | "storico";

export type PreventivoTipoDocumento = "preventivo" | "consuntivo";

export type PreventivoRigaRicambioTipo = "standard" | "materiali_consumo";

export type PreventivoRigaRicambio = {
  id: string;
  ricambioId: string | null;
  codiceOE: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  /** Sconto percentuale sulla riga (0–100). */
  scontoPercent: number;
  /** Default `standard`; `materiali_consumo` = voce fissa qty 1. */
  tipo?: PreventivoRigaRicambioTipo;
};

export type PreventivoManodopera = {
  oreTotali: number;
  righeAddetti: { addetto: string; ore: number }[];
  costoOrario: number;
  /** Sconto percentuale sulla manodopera (0–100). */
  scontoPercent: number;
};

export type PreventivoRecord = {
  id: string;
  numero: string;
  dataCreazione: string;
  aggiornatoAt: string;
  stato: PreventivoStato;
  /** Default storico: `preventivo`. */
  tipoDocumento: PreventivoTipoDocumento;
  lavorazioneId: string;
  lavorazioneOrigine: PreventivoLavorazioneOrigine;
  lavorazioneTimestamp?: string;
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  macchinaRiassunto: string;
  targa: string;
  matricola: string;
  nScuderia: string;
  marcaAttrezzatura: string;
  modelloAttrezzatura: string;
  /** Allineati a scheda ingresso — persistiti in `dettagli` JSON. */
  tipoAttrezzatura: string;
  oreLavoro: string;
  tipoTelaio: string;
  marcaTelaio: string;
  modelloTelaio: string;
  km: string;
  /** Migrazione mezzo + attrezzature. */
  targetType?: "telaio" | "attrezzatura";
  attrezzaturaId?: string | null;
  attrezzaturaMarca?: string;
  attrezzaturaModello?: string;
  attrezzaturaMatricola?: string;
  /** Snapshot immutabile attrezzatura al momento emissione. */
  attrezzaturaSnapshot?: import("@/lib/domain/mezzo-attrezzatura/create-attrezzatura-snapshot").AttrezzaturaDocumentSnapshot;
  livelloCarburante: string;
  richiedente: string;
  descrizioneLavorazioniCliente: string;
  /** Testo tecnico aggregato usato in generazione (per apprendimento). */
  descrizioneLavorazioniTecnicaSorgente: string;
  /** Prima bozza cliente-friendly generata automaticamente. */
  descrizioneGenerataAuto: string;
  /** FK logica generazione Description Engine. */
  descriptionGenerationId?: string;
  /** Meta aggregata generazione (provenance in tabella dedicata). */
  descriptionEngineMeta?: import("@/lib/preventivi/description-engine/types").DescriptionEngineMeta;
  righeRicambi: PreventivoRigaRicambio[];
  manodopera: PreventivoManodopera;
  /** Voce obbligatoria qty 1 — prezzo opzionale. */
  sanificazionePrezzo?: number;
  /** Collaudo funzionale — qty 1, prezzo manuale. */
  collaudoPrezzo?: number;
  noteFinali: string;
  totaleRicambi: number;
  totaleManodopera: number;
  /** 1% sul netto (senza contributo smaltimento), ricalcolato automaticamente. */
  totaleSmaltimento?: number;
  totaleFinale: number;
  createdBy: string;
  lastEditedBy: string;
};

export type PreventivoSortKey =
  | "numero"
  | "tipoDocumento"
  | "dataCreazione"
  | "cliente"
  | "cantiere"
  | "utilizzatore"
  | "macchinaRiassunto"
  | "targa"
  | "matricola"
  | "nScuderia"
  | "totaleFinale"
  | "lavorazioneId";

export type PreventivoSortPhase = "natural" | "asc" | "desc";
