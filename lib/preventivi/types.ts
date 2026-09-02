import type { RicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";

export type PreventivoStatoWorkflow = "bozza" | "inviato" | "acquisito" | "annullato";

export type PreventivoStatoCliente = "pending" | "accettato" | "rifiutato";

export type PreventivoMetodoAccettazione = "cliente" | "timeout_automatico";

/** @deprecated Preferire statoWorkflow + statoCliente. */
export type PreventivoStato = PreventivoStatoWorkflow | "confermato";

export type PreventivoEventType =
  | "created"
  | "sent"
  | "viewed"
  | "accepted_client"
  | "rejected_client"
  | "accepted_timeout"
  | "cancelled"
  | "withdrawn"
  | "version_incremented";

export type PreventivoLavorazioneOrigine = "attiva" | "storico";

export type PreventivoTipoDocumento = "preventivo" | "consuntivo";

/** Origine/contesto del preventivo — non descrive il contenuto delle righe. */
export type PreventivoCategoria = "lavorazione" | "vendita";

export type PreventivoRigaRicambioTipo = "standard" | "materiali_consumo";

export type PreventivoRigaRicambio = {
  id: string;
  ricambioId: string | null;
  codiceOE: string;
  descrizione: string;
  quantita: number;
  /** Default `pz` in normalizzazione struttura. */
  unitaMisura?: RicambioUnitaMisura;
  prezzoUnitario: number;
  /** Costo acquisto unitario (snapshot su riga; default da magazzino se collegato). */
  costoUnitario?: number;
  /** Sconto percentuale sulla riga (0–100). */
  scontoPercent: number;
  /** Default `standard`; `materiali_consumo` = voce fissa qty 1. */
  tipo?: PreventivoRigaRicambioTipo;
};

export type PreventivoRigaAddetto = {
  addettoId: string | null;
  ore: number;
  /** Solo storico — popolato in migrazione, mai in nuove scritture con id valido. */
  addettoLegacy?: string;
  /** Es. addetto storico non convertibile (Officina). */
  legacyWarning?: string;
};

export type PreventivoManodopera = {
  oreTotali: number;
  righeAddetti: PreventivoRigaAddetto[];
  /** Costo interno €/h — non esposto al cliente sul preventivo. */
  costoOrario: number;
  /** Prezzo €/h sul preventivo (cliente). */
  prezzoOrario: number;
  /** Sconto percentuale sulla manodopera (0–100). */
  scontoPercent: number;
};

export type PreventivoRecord = {
  id: string;
  numero: string;
  dataCreazione: string;
  aggiornatoAt: string;
  /** Workflow staff — SSOT: colonna `stato_workflow`. */
  statoWorkflow: PreventivoStatoWorkflow;
  /** Risposta cliente — null se non applicabile. */
  statoCliente: PreventivoStatoCliente | null;
  versione: number;
  inviatoAt?: string | null;
  visualizzatoAt?: string | null;
  accettatoAt?: string | null;
  rifiutatoAt?: string | null;
  scadenzaAccettazioneAt?: string | null;
  metodoAccettazione?: PreventivoMetodoAccettazione | null;
  /** @deprecated Usare statoWorkflow / statoCliente. */
  stato: PreventivoStato;
  /** Default storico: `preventivo`. */
  tipoDocumento: PreventivoTipoDocumento;
  /** Contesto preventivo: lavorazione collegata o vendita standalone. */
  categoriaPreventivo?: PreventivoCategoria;
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
  /** FK mezzo pin al handoff/create — evita re-link da ident editati in editor. */
  mezzoId?: string;
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
  /** Voce obbligatoria — ore (default 1) × prezzo unitario. */
  sanificazioneOre?: number;
  sanificazionePrezzo?: number;
  /** Testo voce sanificazione in PDF/manodopera (default standard). */
  sanificazioneDescrizione?: string;
  /** Collaudo funzionale — ore (default 1) × prezzo unitario. */
  collaudoOre?: number;
  /** Collaudo funzionale — prezzo unitario (€/h). */
  collaudoPrezzo?: number;
  /** Testo voce collaudo in PDF/manodopera (default standard). */
  collaudoDescrizione?: string;
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
