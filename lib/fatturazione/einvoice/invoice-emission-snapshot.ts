/** Immutable emission snapshot shape (FASE 8 SSOT for XML). */
export type InvoiceEmissionSnapshot = {
  cedente?: {
    ragione_sociale?: string | null;
    partita_iva?: string | null;
    codice_fiscale?: string | null;
    indirizzo?: string | null;
    cap?: string | null;
    comune?: string | null;
    provincia?: string | null;
    nazione?: string | null;
    pec?: string | null;
    codice_destinatario?: string | null;
    regime_fiscale?: string | null;
  };
  cliente?: Record<string, unknown>;
  documento?: {
    tipo_documento?: string;
    numero?: number | null;
    serie?: string;
    anno?: number;
    data_emissione?: string;
    data_effettuazione?: string;
    currency?: string;
  };
  righe?: Array<Record<string, unknown>>;
  totali?: { imponibile?: number; iva?: number; totale?: number };
};
