import type { InvoiceDetail } from "@/lib/fatturazione/types";

/** Genera payload JSON minimale per snapshot FatturaPA (XML reale in Fase 2+). */
export function buildFatturapaSnapshotPayload(detail: InvoiceDetail, schemaVersion = "3.0"): Record<string, unknown> {
  const inv = detail.invoice;
  return {
    schema_version: schemaVersion,
    numero: inv.numero,
    anno: inv.anno,
    cliente_label: inv.cliente_label,
    totale: inv.totale,
    imponibile: inv.imponibile,
    iva: inv.iva,
    righe: detail.rows.map((r) => ({
      descrizione: r.descrizione,
      quantita: r.quantita,
      totale: r.totale,
      iva_percent: r.iva_percent,
    })),
  };
}
