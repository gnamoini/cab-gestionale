import assert from "node:assert/strict";
import { parseSdiEvent } from "@/lib/fatturazione/fe-sdi/sdi-event-parser";
import { hashInvoiceXml } from "@/lib/fatturazione/fe-sdi/invoice-xml-hash";
import { buildFatturapaXmlFromSnapshot } from "@/lib/fatturazione/fe-sdi/fatturapa-xml.server";
import {
  invoiceCountsAsValidlyIssued,
  invoiceMatchesCompositeFilter,
  assertFiscalAuthorityNotDocumentStatus,
} from "@/lib/fatturazione/invoice-status";
import type { InvoiceRow } from "@/src/types/supabase-tables";

const base: InvoiceRow = {
  id: "1",
  company_id: "c",
  numero: 1,
  anno: 2026,
  series: "DEFAULT",
  document_type: "fattura",
  status: "emessa",
  document_status: "emessa",
  payment_status: "non_pagata",
  sdi_status: "scartata",
  accounting_status: "stornata",
  fiscal_validity: "not_validly_issued",
  cliente_label: "Test",
  customer_id: null,
  customer_snapshot: {},
  data_emissione: "2026-01-01",
  data_scadenza: null,
  imponibile: 100,
  iva: 22,
  totale: 122,
  pagato: 0,
  residuo: 122,
  origine: "manuale",
  note: null,
  meta: {},
  version: 1,
  fattura_pa_tipo_documento: "TD01",
  invoice_snapshot: {},
  fiscal_transmission_attempt: 1,
  legacy_origin: "NATIVE_CAB",
  data_effettuazione: null,
  payment_term_id: null,
  sent_to_customer_at: null,
  approved_at: null,
  approved_by: null,
  closed_at: null,
  annullata_at: null,
  admin_notes: null,
  created_at: "",
  updated_at: "",
  created_by: null,
  updated_by: null,
  parent_invoice_id: null,
  fiscal_context: {},
};

assert.equal(invoiceCountsAsValidlyIssued({ ...base, fiscal_validity: "pending" }), false);
assert.equal(invoiceCountsAsValidlyIssued({ ...base, fiscal_validity: "validly_issued" }), true);
assert.equal(invoiceCountsAsValidlyIssued({ ...base, status: "emessa", fiscal_validity: "not_validly_issued" }), false);

assert.throws(() => assertFiscalAuthorityNotDocumentStatus("if (row.document_status === 'emessa') revenue++"));

const providerAccepted = parseSdiEvent("ACCEPTED", null, null);
assert.equal(providerAccepted.canonicalEventType, "TECHNICAL_RECEIPT");

const mc = parseSdiEvent("DELIVERY_FAILED", "MC", "impossibilita");
assert.equal(mc.canonicalEventType, "DELIVERY_UNAVAILABLE");
assert.equal(mc.rawSdiEventCode, "MC");

const ns = parseSdiEvent("REJECTED", "NS", "scarto");
assert.equal(ns.canonicalEventType, "REJECTED");

assert.equal(invoiceMatchesCompositeFilter(base, "scartate"), true);
assert.equal(invoiceMatchesCompositeFilter({ ...base, sdi_status: "consegnata", fiscal_validity: "validly_issued" }, "scartate"), false);

const snap = {
  cedente: {
    ragione_sociale: "CAB",
    partita_iva: "12345678901",
    indirizzo: "Via 1",
    cap: "00100",
    comune: "Roma",
    provincia: "RM",
    nazione: "IT",
    regime_fiscale: "RF01",
  },
  cliente: {
    ragione_sociale: "Cliente",
    codice_destinatario: "ABCDEFG",
    cliente_label: "Cliente",
    indirizzo: "Via 2",
    cap: "20100",
    comune: "Milano",
    provincia: "MI",
    nazione: "IT",
  },
  documento: { tipo_documento: "TD01", numero: 1, anno: 2026, data_emissione: "2026-01-01" },
  righe: [{ descrizione: "Servizio", quantita: 1, prezzo_unitario: 100, imponibile: 100, iva: 22, vat_rate: 22 }],
  totali: { imponibile: 100, iva: 22, totale: 122 },
};
const built1 = buildFatturapaXmlFromSnapshot(snap);
const built2 = buildFatturapaXmlFromSnapshot(snap);
assert.equal(built1.ok, true);
assert.equal(built1.xmlHash, built2.xmlHash);
assert.equal(hashInvoiceXml(built1.xml), built1.xmlHash);

console.log("invoice-engine-invariants.test.ts OK");
