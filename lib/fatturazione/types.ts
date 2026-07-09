import type {
  BillingCustomerRow,
  InvoiceLineRow,
  InvoiceLinkRow,
  InvoicePaymentMetodo,
  InvoicePaymentRow,
  InvoiceRow,
  InvoiceRowTipo,
  InvoiceStatus,
  PreventivoBillingStatusRow,
} from "@/src/types/supabase-tables";

export type FatturazioneOrigine = "manuale" | "preventivo" | "multi_preventivo" | "ddt";

export type InvoiceDraftRowInput = {
  tipo: InvoiceRowTipo;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  sconto_percent?: number;
  iva_percent?: number;
  ricambio_id?: string | null;
  lavorazione_id?: string | null;
  preventivo_id?: string | null;
  meta?: Record<string, unknown>;
};

export type InvoiceDraftLinkInput = {
  source_type: InvoiceLinkRow["source_type"];
  source_id: string;
  allocated_imponibile?: number;
  allocated_iva?: number;
  allocated_totale: number;
  meta?: Record<string, unknown>;
};

export type InvoiceCreateInput = {
  origine: FatturazioneOrigine;
  status: Extract<InvoiceStatus, "bozza" | "da_verificare" | "emessa" | "inviata">;
  customer_id?: string | null;
  cliente_label: string;
  customer_snapshot?: Record<string, unknown>;
  data_emissione: string;
  data_scadenza?: string | null;
  note?: string | null;
  admin_notes?: string | null;
  rows: InvoiceDraftRowInput[];
  links?: InvoiceDraftLinkInput[];
};

export type InvoicePaymentInput = {
  invoice_id: string;
  data: string;
  importo: number;
  metodo: InvoicePaymentMetodo;
  riferimento?: string | null;
  note?: string | null;
};

export type CustomerPaymentAllocationInput = {
  open_item_id: string;
  amount: number;
};

export type CustomerPaymentMultiInput = {
  customer_id: string | null;
  data: string;
  importo: number;
  metodo: InvoicePaymentMetodo;
  riferimento?: string | null;
  note?: string | null;
  allocations: CustomerPaymentAllocationInput[];
};

export type InvoiceDetail = {
  invoice: InvoiceRow;
  rows: InvoiceLineRow[];
  links: InvoiceLinkRow[];
  payments: InvoicePaymentRow[];
};

export type InvoiceListPayload = {
  invoices: InvoiceRow[];
  rows: InvoiceLineRow[];
  links: InvoiceLinkRow[];
  payments: InvoicePaymentRow[];
  customers: BillingCustomerRow[];
  preventiviBilling: PreventivoBillingStatusRow[];
};

export type InvoiceKpi = {
  emesseMese: number;
  daIncassare: number;
  scadute: number;
  fatturatoMese: number;
  fatturatoAnno: number;
  clientiConInsoluti: number;
};
