import assert from "node:assert/strict";
import { buildInvoiceKpi, assertNoPreventivoOverbilling, calculateInvoiceTotals } from "@/lib/fatturazione/invoice-calculations";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import type { VatCodeListItem } from "@/lib/vat/types";

const VAT_CODES: VatCodeListItem[] = [
  {
    vat_code_id: "00000000-0000-4000-8000-000000000022",
    code: "IVA22",
    description: "IVA 22%",
    rate: 22,
    nature_code: null,
    operation_type_code: "IMPONIBILE",
    direction: "sales",
  },
];

const inv = (partial: Partial<InvoiceRow> & Pick<InvoiceRow, "id">): InvoiceRow => ({
  company_id: "00000000-0000-4000-8000-000000000001",
  numero: 1,
  anno: 2026,
  series: "DEFAULT",
  status: "emessa",
  document_type: "fattura",
  document_status: null,
  payment_status: null,
  sdi_status: null,
  accounting_status: "non_rilevante",
  fiscal_validity: null,
  fattura_pa_tipo_documento: "TD01",
  data_effettuazione: null,
  payment_term_id: null,
  invoice_snapshot: {},
  fiscal_transmission_attempt: 0,
  legacy_origin: "NATIVE_CAB",
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
  fiscal_context: {},
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
  assert.equal(kpi.fatturatoMese, 122);
}

{
  const kpi = buildInvoiceKpi(
    [inv({ id: "p", fiscal_validity: "pending" }), inv({ id: "r", fiscal_validity: "not_validly_issued" })],
    new Date("2026-06-15"),
  );
  assert.equal(kpi.fatturatoMese, 0);
  assert.equal(kpi.emesseMese, 2);
}

{
  const totals = calculateInvoiceTotals(
    [{ tipo: "libera", descrizione: "Test", quantita: 2, prezzo_unitario: 50, vat_code_id: VAT_CODES[0].vat_code_id }],
    VAT_CODES,
  );
  assert.equal(totals.imponibile, 100);
  assert.equal(totals.iva, 22);
}

{
  const check = assertNoPreventivoOverbilling({ preventivoTotale: 1000, giaFatturato: 700, nuovaAllocazione: 400 });
  assert.equal(check.ok, false);
}

console.log("fatturazione-invoice-calculations.test.ts OK");
