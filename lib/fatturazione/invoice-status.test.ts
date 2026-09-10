import assert from "node:assert/strict";
import { invoiceCountsAsValidlyIssued, invoiceDocumentStatus, invoiceFiscalValidity, invoicePaymentStatus, invoiceSdiStatus } from "./invoice-status";
import type { InvoiceRow } from "@/src/types/supabase-tables";

const base: InvoiceRow = {
  id: "1",
  company_id: "00000000-0000-4000-8000-000000000001",
  numero: 1,
  anno: 2026,
  series: "DEFAULT",
  status: "emessa",
  document_type: "fattura",
  document_status: "emessa",
  payment_status: "non_pagata",
  sdi_status: "da_generare",
  accounting_status: "non_rilevante",
  fiscal_validity: null,
  fattura_pa_tipo_documento: "TD01",
  data_effettuazione: null,
  payment_term_id: null,
  invoice_snapshot: {},
  fiscal_transmission_attempt: 0,
  legacy_origin: "NATIVE_CAB",
  origine: "manuale",
  customer_id: null,
  cliente_label: "Cliente",
  customer_snapshot: {},
  data_emissione: "2026-01-01",
  data_scadenza: null,
  imponibile: 100,
  iva: 22,
  totale: 122,
  pagato: 0,
  residuo: 122,
  note: null,
  admin_notes: null,
  meta: {},
  fiscal_context: {},
  parent_invoice_id: null,
  sent_to_customer_at: null,
  approved_at: null,
  approved_by: null,
  closed_at: null,
  created_by: null,
  updated_by: null,
  annullata_at: null,
  version: 1,
  created_at: "",
  updated_at: "",
};

assert.equal(invoiceDocumentStatus(base), "emessa");
assert.equal(invoicePaymentStatus({ ...base, payment_status: null, status: "pagata" }), "pagata");
assert.equal(invoiceSdiStatus({ ...base, sdi_status: null }), "non_applicabile");
assert.equal(invoiceFiscalValidity({ ...base, fiscal_validity: "not_validly_issued" }), "not_validly_issued");
assert.equal(invoiceCountsAsValidlyIssued({ ...base, fiscal_validity: "pending" }), false);
assert.equal(invoiceCountsAsValidlyIssued(base), true);

console.log("invoice-status.test.ts OK");
