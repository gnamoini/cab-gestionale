import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneRow, MezzoRow } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";

export type InterventoSourceOfTruth = "scheda" | "lavorazione" | "mezzo";

export type InterventoIdent = {
  targa: string;
  matricola: string;
  nScuderia: string;
};

export type MezzoSnapshot = {
  id: string | null;
  cliente: string;
  utilizzatore: string;
  marca: string;
  modello: string;
  targa: string;
  matricola: string;
  nScuderia: string;
  tipoAttrezzatura: string;
  cantiere: string;
  present: boolean;
};

export type LavorazioneSnapshot = {
  id: string;
  mezzoId: string | null;
  dataIngresso: string | null;
  note: string | null;
  /** Ident legacy da riga UI (attiva/storico) quando disponibile. */
  targa: string;
  matricola: string;
  nScuderia: string;
  cliente: string;
  utilizzatore: string;
  cantiere: string;
};

export type SchedaIngressoSnapshot = {
  present: boolean;
  sorgente: "generata" | "file_esterno" | null;
  updatedAt: string | null;
  campi: SchedaIngressoFields | null;
};

export type InterventoContextMeta = {
  schedaMissing: boolean;
  mezzoUnlinked: boolean;
  hasIdentMismatch: boolean;
};

export type InterventoContext = {
  contextId: string;
  lavorazioneId: string;
  mezzo: MezzoSnapshot;
  lavorazione: LavorazioneSnapshot;
  schedaIngresso: SchedaIngressoSnapshot;
  ident: InterventoIdent;
  meta: InterventoContextMeta;
};

export type InterventoDisplayField<T = string> = {
  value: T;
  source: InterventoSourceOfTruth;
};

export type InterventoDisplay = {
  cliente: InterventoDisplayField;
  utilizzatore: InterventoDisplayField;
  cantiere: InterventoDisplayField;
  marcaModello: InterventoDisplayField;
  targa: InterventoDisplayField;
  matricola: InterventoDisplayField;
  nScuderia: InterventoDisplayField;
  ident: InterventoIdent;
  /** Fonte prevalente per anagrafica macchina. */
  primarySource: InterventoSourceOfTruth;
};

export type InterventoContextInputs = {
  lavorazioneId: string;
  lavorazioneRow?: LavorazioneRow | null;
  mezzoRow?: MezzoRow | null;
  mezzoGestito?: MezzoGestito | null;
  legacyLavorazione?: LavorazioneAttiva | LavorazioneArchiviata | null;
  ingressoCampi?: SchedaIngressoFields | null;
  ingressoSorgente?: "generata" | "file_esterno" | null;
  ingressoUpdatedAt?: string | null;
};

export type InterventoContextFetchDeps = {
  getLavorazioneById: (id: string) => Promise<LavorazioneRow | null>;
  getMezzoById: (id: string) => Promise<MezzoRow | null>;
  fetchSchedeBundle: (lavorazioneId: string) => Promise<{
    ingresso: {
      campi: SchedaIngressoFields;
      sorgente: "generata" | "file_esterno";
      updatedAt: string;
    } | null;
  } | null>;
};
