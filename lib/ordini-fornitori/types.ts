import type { OrdineFornitoreRigaRow, OrdineFornitoreRow } from "@/src/types/supabase-tables";
import type { RicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";

export type OrdineFornitoreStatus =
  | "bozza"
  | "inviato"
  | "confermato"
  | "spedito"
  | "ricevuto"
  | "annullato";

export type OrdineFornitoreLinkSourceType = "lavorazione" | "preventivo" | "scheda" | "magazzino";

export type OrdineFornitoreRiga = {
  id: string;
  ordine: number;
  ricambioId: string | null;
  codice: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  scontoPercent: number;
  totaleRiga: number;
  unitaMisura: RicambioUnitaMisura;
  ivaPercent: number;
  meta: Record<string, unknown>;
};

export type OrdineFornitoreRecord = {
  id: string;
  numero: string;
  status: OrdineFornitoreStatus;
  /** Testo libero; persistito in meta.oggettoOrdine. */
  oggettoOrdine: string;
  dataOrdine: string;
  fornitoreLabel: string;
  fornitoreSnapshot: Record<string, unknown>;
  destinazione: string;
  destinazioneSnapshot: Record<string, unknown>;
  logisticaSnapshot: Record<string, unknown>;
  note: string;
  imponibileRighe: number;
  trasporto: number;
  imponibile: number;
  ivaPercent: number;
  iva: number;
  totale: number;
  lavorazioneId: string | null;
  preventivoId: string | null;
  schedaLavorazioneId: string | null;
  pdfArtifactHash: string | null;
  meta: Record<string, unknown>;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  righe: OrdineFornitoreRiga[];
};

export type OrdineFornitoreRigaInput = {
  id?: string;
  ordine?: number;
  ricambio_id?: string | null;
  codice?: string | null;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  sconto_percent?: number;
  meta?: Record<string, unknown>;
};

export type OrdineFornitoreCreateInput = {
  status?: OrdineFornitoreStatus;
  data_ordine: string;
  fornitore_label: string;
  fornitore_snapshot?: Record<string, unknown>;
  destinazione?: string | null;
  destinazione_snapshot?: Record<string, unknown>;
  logistica_snapshot?: Record<string, unknown>;
  note?: string | null;
  trasporto?: number;
  iva_percent?: number;
  lavorazione_id?: string | null;
  preventivo_id?: string | null;
  scheda_lavorazione_id?: string | null;
  meta?: Record<string, unknown>;
  righe: OrdineFornitoreRigaInput[];
};

export type OrdineFornitoreUpdateInput = Partial<
  Omit<OrdineFornitoreCreateInput, "righe"> & { righe?: OrdineFornitoreRigaInput[] }
>;

export type OrdineFornitoreListPayload = {
  ordini: OrdineFornitoreRow[];
  righe: OrdineFornitoreRigaRow[];
};

export type OrdineFornitoreDetail = {
  ordine: OrdineFornitoreRow;
  righe: OrdineFornitoreRigaRow[];
};

export type OrdineFornitoreSortKey =
  | "numero"
  | "dataOrdine"
  | "fornitore"
  | "oggettoOrdine"
  | "destinazioneTipo"
  | "totale"
  | "status";
