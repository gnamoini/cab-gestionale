import assert from "node:assert/strict";
import { endOfLocalDay, startOfLocalDay } from "@/lib/report/date-ranges";
import { buildInvoicePeriodKpiExtended } from "@/lib/report/economic-analytics-extended";
import { computeEcoImportoScaduto } from "@/lib/report/analytics-engine/calculators";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { InvoiceRow } from "@/src/types/supabase-tables";

const range = {
  start: startOfLocalDay(new Date("2026-02-01T00:00:00.000Z")),
  end: endOfLocalDay(new Date("2026-02-28T23:59:59.999Z")),
};

const today = new Date();
const yesterday = new Date(today);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const yesterdayYmd = yesterday.toISOString().slice(0, 10);
const tomorrow = new Date(today);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const tomorrowYmd = tomorrow.toISOString().slice(0, 10);
const todayYmd = today.toISOString().slice(0, 10);

function baseInvoice(overrides: Partial<InvoiceRow>): InvoiceRow {
  return {
    id: "inv-base",
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
    cliente_label: "Cliente",
    customer_snapshot: {},
    data_emissione: "2026-02-15",
    data_scadenza: yesterdayYmd,
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
    ...overrides,
  };
}

function minimalBundle(invoices: InvoiceRow[]): ReportAnalyticsSourceBundle {
  return {
    period: { preset: "custom" as const, start: "2026-02-01", end: "2026-02-28", compareMode: "none" as const },
    range,
    compareRange: null,
    compareMode: "none",
    rangeKey: "test",
    requirements: {
      metricIds: ["eco_importo_scaduto"],
      invoices: true,
      invoicePayments: true,
      preventivi: false,
      ddt: false,
      timesheet: false,
      schede: false,
      ordini: false,
    },
    integrity: {} as ReportAnalyticsSourceBundle["integrity"],
    lavRows: [],
    magazzinoRows: [],
    preventivi: [],
    invoices,
    invoicePayments: [],
    ddtDocuments: [],
    ordini: [],
    totalHours: 0,
    timesheetEntries: [],
    timesheetEmployees: [],
    schedeStore: null,
    costoOrario: 0,
    invoicesAvailable: true,
    ddtAvailable: false,
    ordiniAvailable: false,
    loadedSlices: new Set(["invoices", "invoicePayments"]),
  };
}

function legacyImportoScaduto(invoices: InvoiceRow[]): number {
  return buildInvoicePeriodKpiExtended(invoices, [], range).importoScaduto;
}

function engineImportoScaduto(invoices: InvoiceRow[]): number {
  return computeEcoImportoScaduto({ bundle: minimalBundle(invoices), range }).value;
}

assert.equal(engineImportoScaduto([baseInvoice({})]), legacyImportoScaduto([baseInvoice({})]));

const partial = baseInvoice({ id: "p1", residuo: 500, pagato: 720 });
assert.equal(engineImportoScaduto([partial]), 500);

const notDue = baseInvoice({ id: "nd", data_scadenza: tomorrowYmd });
assert.equal(engineImportoScaduto([notDue]), 0);

const paid = baseInvoice({ id: "fp", residuo: 0, pagato: 1220, status: "pagata" });
assert.equal(engineImportoScaduto([paid]), 0);

const dueToday = baseInvoice({ id: "dt", data_scadenza: todayYmd });
assert.equal(engineImportoScaduto([dueToday]), 0);

const ann = baseInvoice({ id: "an", status: "annullata" });
assert.equal(engineImportoScaduto([ann]), 0);

const noDue = baseInvoice({ id: "ns", data_scadenza: null });
assert.equal(engineImportoScaduto([noDue]), 0);

const mix = [partial, notDue, paid, dueToday, ann, noDue];
assert.equal(engineImportoScaduto(mix), legacyImportoScaduto(mix));

console.log("eco-importo-scaduto-parity.test.ts OK");
