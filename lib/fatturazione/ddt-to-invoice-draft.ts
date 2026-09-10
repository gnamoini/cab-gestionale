import type { DdtDetail } from "@/lib/ddt/types";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import type { InvoiceDraftLinkInput, InvoiceDraftRowInput } from "@/lib/fatturazione/types";
import { buildPreventivoOutputRighe } from "@/lib/preventivi/preventivi-struttura";
import type { PreventivoRecord } from "@/lib/preventivi/types";

function priceFromPreventivo(preventivo: PreventivoRecord | undefined, descrizione: string): number {
  if (!preventivo) return 0;
  const needle = descrizione.trim().toLowerCase();
  const output = buildPreventivoOutputRighe(preventivo);
  let firstPriced = 0;
  for (const line of output) {
    if (line.sezione === "ricambi" && "riga" in line) {
      const prezzo = Math.max(0, Number(line.riga.prezzoUnitario ?? 0));
      if (!firstPriced && prezzo > 0) firstPriced = prezzo;
      if (String(line.riga.descrizione ?? "").trim().toLowerCase() === needle) return prezzo;
      continue;
    }
    const prezzo = Math.max(0, Number(line.prezzoUnitario ?? 0));
    if (!firstPriced && prezzo > 0) firstPriced = prezzo;
    if (String(line.descrizione ?? "").trim().toLowerCase() === needle) return prezzo;
  }
  return firstPriced;
}

/** Bridge DDT → bozza fattura: prezzi da preventivo/consuntivo collegato. */
export function ddtToInvoiceDraft(
  detail: DdtDetail,
  defaultVatCodeId = "",
  preventivo?: PreventivoRecord | null,
): {
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
    prezzo_unitario: priceFromPreventivo(preventivo ?? undefined, r.descrizione),
    sconto_percent: 0,
    vat_code_id: defaultVatCodeId,
    preventivo_id: r.preventivo_id,
    lavorazione_id: doc.lavorazione_id,
    meta: { ddt_row_id: r.id, codice: r.codice, source_ref: r.source_ref },
  }));

  if (rows.length === 0) {
    rows.push({
      tipo: "libera",
      descrizione: `Servizi da DDT ${ddtDisplayNumber(doc)}`,
      quantita: 1,
      prezzo_unitario: preventivo ? Math.max(0, preventivo.totaleFinale ?? 0) : 0,
      vat_code_id: defaultVatCodeId,
      lavorazione_id: doc.lavorazione_id,
      preventivo_id: doc.preventivo_id,
    });
  }

  const allocated = rows.reduce((sum, r) => sum + r.quantita * r.prezzo_unitario, 0);
  const links: InvoiceDraftLinkInput[] = [
    {
      source_type: "ddt",
      source_id: doc.id,
      allocated_totale: allocated,
      allocated_imponibile: allocated,
      allocated_iva: 0,
      meta: { ddt_numero: ddtDisplayNumber(doc) },
    },
  ];

  if (doc.preventivo_id) {
    links.push({
      source_type: "preventivo",
      source_id: doc.preventivo_id,
      allocated_totale: allocated,
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
