import type { LavorazioneInterventionType } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";

export type MezzoPriorita = "normale" | "media" | "alta";

/** Opzionale: collegamento esplicito a riga lavorazione (id). */
export type MezzoGestito = {
  id: string;
  /** Se valorizzato, match prioritario con `LavorazioneAttiva.id` / `LavorazioneArchiviata.id` */
  lavorazioneMezzoId?: string;
  cliente: string;
  utilizzatore: string;
  marca: string;
  modello: string;
  targa: string;
  matricola: string;
  /** N. scuderia / postazione flotta (opzionale, usato in ricerca e identificazione). */
  numeroScuderia?: string;
  tipoAttrezzatura: string;
  /** Da meta impostazioni / anagrafica estesa. */
  cantiere?: string;
  /** Da meta: mezzo in matrice tagliandi (default no). */
  tagliandi?: boolean;
  tipoTelaio?: string;
  marcaTelaio?: string;
  modelloTelaio?: string;
  /** Alias UI da mezzi.telaio_num (I-VIN-1). */
  vin?: string;
  anno: number;
  oreKm: number;
  km?: number;
  statoAttuale: string;
  dataUltimaUscita: string;
  note: string;
  priorita: MezzoPriorita;
  /**
   * Se true: riga costruita automaticamente da lavorazione / preventivo / documento
   * perché non esiste ancora un record corrispondente in anagrafica mezzi.
   */
  hubSynthetic?: boolean;
  /** ISO timestamp ultimo aggiornamento anagrafica mezzo (DB `updated_at`). */
  ultimaModifica?: string;
  /** Cache metering V1 — ultimo km rilevato da scheda/intervento. */
  ultimoKmRilevato?: number | null;
  ultimoKmData?: string | null;
  ultimoOreRilevate?: number | null;
  ultimoOreData?: string | null;
  ultimoAggiornamentoDaLavorazioneId?: string | null;
};

export type MezziSortKey =
  | "cliente"
  | "cantiere"
  | "marca"
  | "modello"
  | "targa"
  | "matricola"
  | "numeroScuderia"
  | "ultimaLavorazione"
  | "numeroLavorazioni";

export type MezziSortPhase = "natural" | "asc" | "desc";

/** Riga sintetica da dati Lavorazioni (attive + storico). */
export type MezzoInterventoLavorazione = {
  id: string;
  origine: "storico" | "attiva";
  /** Codice umano lavorazione (es. 26-0001). */
  codice?: string | null;
  dataIngresso: string;
  dataCompletamento: string | null;
  durataGiorniLabel: string;
  durataGiorniNum: number;
  tipoIntervento: string;
  /** Tipo intervento scheda ingresso (is_tagliando + repair_present). */
  interventionType?: LavorazioneInterventionType;
  descrizione: string;
  prioritaLabel: string;
  statoFinale: string;
  statoId?: string;
  /** Target intervento (telaio / attrezzatura). */
  targetType?: "telaio" | "attrezzatura";
  operatorePrincipale?: string | null;
  oreTotali?: number | null;
  ricambiCount?: number;
  hasSchede?: boolean;
  /** FK mezzo assente — collegamento fuzzy o debole. */
  weakMezzoLink?: boolean;
};
