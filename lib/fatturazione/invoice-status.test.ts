import assert from "node:assert/strict";
import { invoiceDocumentStatus, invoicePaymentStatus, invoiceSdiStatus } from "./invoice-status";
import type { InvoiceRow } from "@/src/types/supabase-tables";

const base: InvoiceRow = {
  id: "1",
  numero: 1,
  anno: 2026,
  status: "emessa",
  document_type: "fattura",
  document_status: "emessa",
  payment_status: "non_pagata",
  sdi_status: "da_generare",
  accounting_status: "non_rilevante",
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
  parent_invoice_id: null,
  sent_to_customer_at: null,
  approved_at: null,
  approved_by: null,
  closed_at: null,
  created_by: null,
  updated_by: null,
  annullata_at: null,
  created_at: "",
  updated_at: "",
};

assert.equal(invoiceDocumentStatus(base), "emessa");
assert.equal(invoicePaymentStatus({ ...base, payment_status: null, status: "pagata" }), "pagata");
assert.equal(invoiceSdiStatus({ ...base, sdi_status: null }), "non_applicabile");

console.log("invoice-status.test.ts OK");
