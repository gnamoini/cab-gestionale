/** Schede lavorazione — fascicolo digitale per intervento (ingresso, lavori, ricambi). */

export type SchedaTipo = "ingresso" | "lavorazioni" | "ricambi";

export type SchedaSorgente = "generata" | "file_esterno";

/** Badge UX (derivato anche in UI da sorgente / date). */
export type SchedaStatoUi = "mancante" | "creata" | "caricata" | "aggiornata";

export type SchedaFileEsterno = {
  fileName: string;
  mime: string;
  /** Base64 senza prefisso data: */
  dataBase64: string;
};

export type SchedaMeta = {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tipo: SchedaTipo;
  sorgente: SchedaSorgente;
  /** Se caricato PDF/immagine da esterno. */
  fileEsterno: SchedaFileEsterno | null;
};

export type InterventoTargetTypeScheda = "telaio" | "attrezzatura";

/** SCHEDA INGRESSO — campi officina. */
export type SchedaIngressoFields = {
  /** Target intervento (migrazione mezzo + attrezzature). */
  targetType?: InterventoTargetTypeScheda;
  attrezzaturaId?: string | null;
  dataIngresso: string;
  cliente: string;
  cantiere: string;
  utilizzatore: string;
  tipoAttrezzatura: string;
  marcaAttrezzatura: string;
  modelloAttrezzatura: string;
  matricola: string;
  nScuderia: string;
  oreLavoro: string;
  tipoTelaio: string;
  marcaTelaio: string;
  modelloTelaio: string;
  /** Alias UI → mezzi.telaio_num (I-VIN-1). */
  vin: string;
  targa: string;
  km: string;
  descrizioneAnomalia: string;
  livelloCarburante: string;
  addettoAccettazione: string;
  /** Richiedente intervento (testo libero). */
  richiedente: string;
  /** Telefono del richiedente / autista. */
  richiedenteTelefono: string;
  /** Firma richiedente (PNG data URL). */
  richiedenteFirma?: string;
  /** Note operative aggiuntive (distinte da descrizione anomalia). */
  noteIntervento: string;
};

export type SchedaIngressoDoc = SchedaMeta & {
  tipo: "ingresso";
  campi: SchedaIngressoFields;
};

/** Ore per singolo addetto su una riga lavorazione (multi-assegnazione). */
export type RigaAddettoOreScheda = {
  addetto: string;
  oreImpiegate: number;
};

export type RigaLavorazioneScheda = {
  id: string;
  dataLavorazione: string;
  lavorazioniEffettuate: string;
  addettiAssegnati: RigaAddettoOreScheda[];
};

export type SchedaLavorazioniFields = {
  identificazioneMacchina: string;
  righe: RigaLavorazioneScheda[];
};

export type SchedaLavorazioniDoc = SchedaMeta & {
  tipo: "lavorazioni";
  campi: SchedaLavorazioniFields;
};

export type RigaRicambioScheda = {
  id: string;
  ricambioId: string | null;
  ricambioNome: string;
  codice: string;
  quantita: number;
  addetto: string;
  dataUtilizzo: string;
  /** Se è stato applicato scarico magazzino da questa riga. */
  scaricoMagazzinoApplicato?: boolean;
};

export type SchedaRicambiFields = {
  identificazioneMacchina: string;
  righe: RigaRicambioScheda[];
};

export type SchedaRicambiDoc = SchedaMeta & {
  tipo: "ricambi";
  campi: SchedaRicambiFields;
};

/** Metadati cache in-memory (non persistiti su DB). */
export type BundleCacheMeta = {
  /** max(updated_at) delle righe scheda_lavorazione per questo bundle. */
  _revision?: string;
  _fetchedAt?: number;
};

export type LavorazioneSchedeBundle = {
  lavorazioneId: string;
  /** Codice umano display (es. 26-0001). Non sostituisce lavorazioneId uuid. */
  codice?: string | null;
  ingresso: SchedaIngressoDoc | null;
  lavorazioni: SchedaLavorazioniDoc | null;
  ricambi: SchedaRicambiDoc | null;
} & BundleCacheMeta;

export type LavorazioneSchedeStore = Record<string, LavorazioneSchedeBundle>;
