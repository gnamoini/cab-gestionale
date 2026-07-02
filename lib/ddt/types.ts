import type { DdtDocumentRow, DdtLineRow, DdtLinkRow, InterventoTargetType, PreventivoDdtFulfillmentRow } from "@/src/types/supabase-tables";

export type DdtStatus = "bozza" | "confermato" | "stampato" | "consegnato" | "annullato";

export type DdtOrigine = "preventivo" | "manuale" | "lavorazione" | "ordine" | "fattura";

export type DdtRowSourceType = "preventivo_riga" | "preventivo_output" | "libera";

export type DdtLinkSourceType = "preventivo" | "lavorazione" | "ordine" | "fattura" | "mezzo";

export type DdtAddressSnapshot = {
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  nazione?: string;
};

export type DdtMezzoSnapshot = {
  targa?: string | null;
  matricola?: string | null;
  telaio?: string | null;
  attrezzatura?: string | null;
  cantiere?: string | null;
  utilizzatore?: string | null;
  marca?: string | null;
  modello?: string | null;
};

export type DdtRowInput = {
  source_type: DdtRowSourceType;
  source_ref: string;
  preventivo_id?: string | null;
  descrizione: string;
  codice?: string | null;
  quantita: number;
  unita_misura?: string;
  note?: string | null;
  meta?: Record<string, unknown>;
};

export type DdtLinkInput = {
  source_type: DdtLinkSourceType;
  source_id: string;
  meta?: Record<string, unknown>;
};

export type DdtCreateInput = {
  status?: "bozza" | "confermato";
  confirm?: boolean;
  anno?: number;
  serie?: string;
  data_documento: string;
  data_consegna?: string | null;
  cliente_label: string;
  customer_snapshot?: Record<string, unknown>;
  luogo_consegna?: DdtAddressSnapshot;
  preventivo_id?: string | null;
  lavorazione_id?: string | null;
  mezzo_id?: string | null;
  mezzo_snapshot?: DdtMezzoSnapshot;
  target_type?: InterventoTargetType | null;
  attrezzatura_id?: string | null;
  attrezzatura_snapshot?: Record<string, unknown>;
  causale_trasporto?: string | null;
  vettore?: string | null;
  note?: string | null;
  origine?: DdtOrigine;
  rows: DdtRowInput[];
  links?: DdtLinkInput[];
};

export type DdtDetail = {
  document: DdtDocumentRow;
  rows: DdtLineRow[];
  links: DdtLinkRow[];
};

export type DdtListPayload = {
  documents: DdtDocumentRow[];
  rows: DdtLineRow[];
  links: DdtLinkRow[];
  fulfillment: PreventivoDdtFulfillmentRow[];
};

export type DdtKpi = {
  totale: number;
  bozze: number;
  confermati: number;
  stampati: number;
  consegnati: number;
  annullati: number;
};

/** Riga selezionabile nel wizard da preventivo. */
export type PreventivoDdtSelectableLine = {
  source_ref: string;
  source_type: DdtRowSourceType;
  descrizione: string;
  codice?: string | null;
  qty_ordered: number;
  qty_delivered: number;
  qty_residual: number;
  unita_misura: string;
  sezione: string;
};
