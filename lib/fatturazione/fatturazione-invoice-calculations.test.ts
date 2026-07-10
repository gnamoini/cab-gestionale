import assert from "node:assert/strict";
import { buildInvoiceKpi, assertNoPreventivoOverbilling, calculateInvoiceTotals } from "@/lib/fatturazione/invoice-calculations";
import type { InvoiceRow } from "@/src/types/supabase-tables";

const inv = (partial: Partial<InvoiceRow> & Pick<InvoiceRow, "id">): InvoiceRow => ({
  numero: 1,
  anno: 2026,
  status: "emessa",
  document_type: "fattura",
  document_status: null,
  payment_status: null,
  sdi_status: null,
  accounting_status: "non_rilevante",
  parent_invoice_id: null,
  sent_to_customer_at: null,
  approved_at: null,
  approved_by: null,
  closed_at: null,
  customer_id: null,
  cliente_label: "Cliente A",
  customer_snapshot: {},
  data_emissione: "2026-06-10",
  data_scadenza: "2026-06-20",
  imponibile: 100,
  iva: 22,
  totale: 122,
  pagato: 0,
  residuo: 122,
  note: null,
  admin_notes: null,
  origine: null,
  meta: {},
  created_by: null,
  updated_by: null,
  annullata_at: null,
  version: 1,
  created_at: "",
  updated_at: "",
  ...partial,
});

{
  const kpi = buildInvoiceKpi([inv({ id: "1" })], new Date("2026-06-15"));
  assert.equal(kpi.emesseMese, 1);
}

{
  const totals = calculateInvoiceTotals([
    { tipo: "libera", descrizione: "Test", quantita: 2, prezzo_unitario: 50, iva_percent: 22 },
  ]);
  assert.equal(totals.imponibile, 100);
}

{
  const check = assertNoPreventivoOverbilling({ preventivoTotale: 1000, giaFatturato: 700, nuovaAllocazione: 400 });
  assert.equal(check.ok, false);
}

console.log("fatturazione-invoice-calculations.test.ts OK");
