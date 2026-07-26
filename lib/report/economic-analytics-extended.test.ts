import assert from "node:assert/strict";
import {
  buildInvoicePeriodKpiExtended,
  buildMarginWaterfall,
  buildPreventiviFunnel,
  buildResiduoDaFatturare,
  buildRevenueCollectionMonthlySeries,
  buildTopClientiFatturatoEnriched,
  computeTopClienteConcentration,
} from "@/lib/report/economic-analytics-extended";
import type { InvoicePaymentRow, InvoiceRow, PreventivoBillingStatusRow } from "@/src/types/supabase-tables";

const range = {
  start: new Date("2026-01-01"),
  end: new Date("2026-03-31"),
};

const invoice: InvoiceRow = {
  id: "inv-1",
  numero: 1,
  anno: 2026,
  status: "emessa",
  document_type: null,
  document_status: null,
  payment_status: "non_pagata",
  sdi_status: null,
  accounting_status: null,
  origine: null,
  customer_id: null,
  cliente_label: "Cliente A",
  customer_snapshot: {},
  data_emissione: "2026-02-15",
  data_scadenza: "2026-01-01",
  imponibile: 1000,
  iva: 220,
  totale: 1220,
  pagato: 0,
  residuo: 1220,
  note: null,
  admin_notes: null,
  meta: {},
  parent_invoice_id: null,
  sent_to_customer_at: null,
  approved_at: null,
  approved_by: null,
  closed_at: null,
  version: 1,
  created_by: null,
  updated_by: null,
  annullata_at: null,
  created_at: "2026-02-15T00:00:00.000Z",
  updated_at: "2026-02-15T00:00:00.000Z",
};

const payment: InvoicePaymentRow = {
  id: "pay-1",
  invoice_id: "inv-1",
  data: "2026-02-20",
  importo: 500,
  metodo: "bonifico",
  riferimento: null,
  note: null,
  created_by: null,
  created_at: "2026-02-20T00:00:00.000Z",
};

const kpi = buildInvoicePeriodKpiExtended([invoice], [payment], range);
assert.equal(kpi.fatturato, 1220);
assert.equal(kpi.incassato, 500);
assert.equal(kpi.scadute, 1);
assert.equal(kpi.importoScaduto, 1220);

const series = buildRevenueCollectionMonthlySeries([invoice], [payment], range);
assert.ok(series.some((p) => p.fatturato === 1220 && p.incassato === 500));

const waterfall = buildMarginWaterfall(10000, 3000, 2000);
assert.equal(waterfall.at(-1)?.value, 5000);

const billing: PreventivoBillingStatusRow[] = [
  {
    preventivo_id: "p1",
    preventivo_totale: 1000,
    fatturato: 200,
    residuo: 800,
    stato_fatturazione: "parzialmente_fatturato",
  },
];
assert.equal(buildResiduoDaFatturare(billing), 800);

const top = buildTopClientiFatturatoEnriched([invoice], range, 5);
assert.equal(top[0]?.cliente, "Cliente A");
assert.equal(top[0]?.pct, 100);

const concentration = computeTopClienteConcentration([invoice], range);
assert.equal(concentration?.sharePct, 100);

const funnel = buildPreventiviFunnel(
  [
    {
      id: "p1",
      numero: "001",
      stato: "confermato",
      dataCreazione: "2026-02-01",
      aggiornatoAt: "2026-02-01",
      totaleFinale: 1000,
    } as never,
  ],
  range,
);
assert.equal(funnel.length, 1);

console.log("economic-analytics-extended.test.ts OK");
