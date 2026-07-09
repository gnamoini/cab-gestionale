import type { DdtDetail } from "@/lib/ddt/types";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import type { InvoiceDraftLinkInput, InvoiceDraftRowInput } from "@/lib/fatturazione/types";

/** Bridge DDT → bozza fattura: righe da consegna, link partita DDT. */
export function ddtToInvoiceDraft(detail: DdtDetail): {
  cliente_label: string;
  customer_snapshot: Record<string, unknown>;
  data_emissione: string;
  note: string | null;
  rows: InvoiceDraftRowInput[];
  links: InvoiceDraftLinkInput[];
} {
  const doc = detail.document;
  const rows: InvoiceDraftRowInput[] = detail.rows.map((r) => ({
    tipo: "libera",
    descrizione: r.descrizione.trim() || r.codice?.trim() || "Riga DDT",
    quantita: Math.max(r.quantita, 0.001),
    prezzo_unitario: 0,
    sconto_percent: 0,
    iva_percent: 22,
    preventivo_id: r.preventivo_id,
    lavorazione_id: doc.lavorazione_id,
    meta: { ddt_row_id: r.id, codice: r.codice, source_ref: r.source_ref },
  }));

  if (rows.length === 0) {
    rows.push({
      tipo: "libera",
      descrizione: `Servizi da DDT ${ddtDisplayNumber(doc)}`,
      quantita: 1,
      prezzo_unitario: 0,
      iva_percent: 22,
      lavorazione_id: doc.lavorazione_id,
      preventivo_id: doc.preventivo_id,
    });
  }

  const links: InvoiceDraftLinkInput[] = [
    {
      source_type: "ddt",
      source_id: doc.id,
      allocated_totale: 0,
      allocated_imponibile: 0,
      allocated_iva: 0,
      meta: { ddt_numero: ddtDisplayNumber(doc) },
    },
  ];

  if (doc.preventivo_id) {
    links.push({
      source_type: "preventivo",
      source_id: doc.preventivo_id,
      allocated_totale: 0,
      meta: { from_ddt_id: doc.id },
    });
  }

  return {
    cliente_label: doc.cliente_label,
    customer_snapshot: doc.customer_snapshot ?? {},
    data_emissione: doc.data_documento,
    note: doc.causale_trasporto ? `Da DDT ${ddtDisplayNumber(doc)} — ${doc.causale_trasporto}` : `Da DDT ${ddtDisplayNumber(doc)}`,
    rows,
    links,
  };
}
