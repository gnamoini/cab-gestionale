import assert from "node:assert/strict";
import { generateValidatedInvoiceXml } from "@/lib/accounting/einvoice";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import { buildFatturapaXmlFromSnapshot } from "@/lib/fatturazione/fe-sdi/fatturapa-xml.server";
import { SimulatorElectronicInvoicingProvider } from "@/lib/fatturazione/fe-sdi/simulator-provider";
import { isPreventivoAccettato } from "@/lib/fatturazione/ciclo-attivo/preventivo-accettato";
import { mapCicloAttivoError } from "@/lib/fatturazione/ciclo-attivo/error-codes";
import { parseSdiEvent } from "@/lib/fatturazione/fe-sdi/sdi-event-parser";

const snapshot = {
  cedente: {
    ragione_sociale: "CAB Officina DEMO",
    partita_iva: "12345678901",
    codice_fiscale: "12345678901",
    indirizzo: "Via Demo 1",
    cap: "00100",
    comune: "Roma",
    provincia: "RM",
    nazione: "IT",
    pec: "demo@pec.example.it",
    codice_destinatario: "0000000",
    regime_fiscale: "RF01",
  },
  cliente: {
    ragione_sociale: "Cliente SPA",
    pec: "cliente@pec.example.it",
    codice_destinatario: "0000000",
    indirizzo: "Via Cliente 1",
    cap: "20100",
    comune: "Milano",
    provincia: "MI",
    nazione: "IT",
  },
  documento: {
    tipo_documento: "TD01",
    numero: 1,
    serie: "DEFAULT",
    anno: 2026,
    data_emissione: "2026-06-10",
  },
  righe: [{ descrizione: "Lavoro", quantita: 1, prezzo_unitario: 100, imponibile: 100, iva: 22, vat_rate: 22 }],
  totali: { imponibile: 100, iva: 22, totale: 122 },
};

{
  const ok = buildFatturapaXmlFromSnapshot(snapshot);
  assert.equal(ok.ok, true);
  assert.match(ok.xml, /PECDestinatario/);
  assert.match(ok.xml, /0000000/);
  assert.match(ok.xml, /<TipoDocumento>TD01<\/TipoDocumento>/);
}

{
  const overlay = buildFatturapaXmlFromSnapshot(snapshot, {
    pec: "overlay@pec.example.it",
    codice_destinatario: "0000000",
  });
  assert.equal(overlay.ok, true);
  assert.match(overlay.xml, /overlay@pec.example.it/);
}

for (const td of ["TD01"] as const) {
  const built = buildFatturapaXmlFromSnapshot({
    ...snapshot,
    documento: { ...snapshot.documento, tipo_documento: td },
  });
  assert.equal(built.ok, true, td);
  assert.match(built.xml, new RegExp(`<TipoDocumento>${td}</TipoDocumento>`));
}

for (const td of ["TD04", "TD05"] as const) {
  const canonical = buildCanonicalFromSnapshot("inv", "co", {
    ...snapshot,
    documento: { ...snapshot.documento, tipo_documento: td },
  }, {
    references: {
      linkedDocuments: [{ type: "fattura_collegata", id: "f1", label: "Fattura orig", number: "1/2026", date: "2026-01-01" }],
    },
  });
  const built = generateValidatedInvoiceXml(canonical);
  assert.match(built.xml, new RegExp(td));
}

for (const td of ["TD24", "TD25"] as const) {
  const canonical = buildCanonicalFromSnapshot("inv", "co", {
    ...snapshot,
    documento: { ...snapshot.documento, tipo_documento: td },
  }, {
    references: {
      linkedDocuments: [{ type: "ddt", id: "d1", label: "DDT 1", number: "DDT-1", date: "2026-06-01" }],
    },
  });
  const built = generateValidatedInvoiceXml(canonical);
  assert.match(built.xml, new RegExp(td));
}

{
  const natura = buildFatturapaXmlFromSnapshot({
    ...snapshot,
    righe: [{ descrizione: "Esente", quantita: 1, prezzo_unitario: 100, imponibile: 100, iva: 0, vat_nature: "N4" }],
    totali: { imponibile: 100, iva: 0, totale: 100 },
  });
  assert.equal(natura.ok, true);
  assert.match(natura.xml, /<Natura>N4<\/Natura>/);
  assert.match(natura.xml, /<AliquotaIVA>0\.00<\/AliquotaIVA>/);
}

{
  const bad = buildFatturapaXmlFromSnapshot({
    ...snapshot,
    totali: { imponibile: 100, iva: 22, totale: 999 },
    cliente: { ragione_sociale: "X", codice_destinatario: "0000000", pec: "" },
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes("TOTALS_GROSS_MISMATCH") || e.includes("TOTALS_MISMATCH")));
  assert.ok(bad.errors.some((e) => e.includes("RECIPIENT")));
}

function baseSubmit(over: Record<string, string>) {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    invoiceId: over.invoiceId ?? `inv-${stamp}`,
    xml: over.xml ?? "<xml/>",
    xmlHash: over.xmlHash ?? "abc",
    filename: over.filename ?? "IT.xml",
    idempotencyKey: over.idempotencyKey ?? `idemp-${stamp}`,
    correlationKey: over.correlationKey ?? `corr-${stamp}`,
  };
}

async function runSimulatorChecks() {
  const sim = new SimulatorElectronicInvoicingProvider();
  const input = baseSubmit({});
  const first = await sim.submitInvoice(input);
  const beforeNtf = (await sim.getNotifications()).length;
  const second = await sim.submitInvoice(input);
  assert.equal(second.errorCode, "ALREADY_SUBMITTED");
  assert.equal(second.providerReference, first.providerReference);
  const found = await sim.findSubmissionByCorrelation(input.correlationKey);
  assert.equal(found.found, true);
  assert.equal((await sim.getNotifications()).length, beforeNtf);

  const delivered = await sim.submitInvoice(baseSubmit({ xml: "<ok/>" }));
  assert.equal(delivered.remoteStatus, "DELIVERED");
  assert.equal(delivered.accepted, true);

  const rejected = await sim.submitInvoice(baseSubmit({ xml: "SIM-REJECT" }));
  assert.equal(rejected.remoteStatus, "REJECTED");
  assert.equal(rejected.accepted, false);

  const failed = await sim.submitInvoice(baseSubmit({ xml: "SIM-DELIVERY-FAILED" }));
  assert.equal(failed.remoteStatus, "DELIVERY_FAILED");

  await assert.rejects(
    () => sim.submitInvoice(baseSubmit({ xml: "SIM-TIMEOUT" })),
    /PROVIDER_TIMEOUT/,
  );
  await assert.rejects(
    () => sim.submitInvoice(baseSubmit({ xml: "SIM-429" })),
    /PROVIDER_429/,
  );
  await assert.rejects(
    () => sim.submitInvoice(baseSubmit({ xml: "SIM-500" })),
    /PROVIDER_500/,
  );

  const timeoutKey = `c-timeout-absent-${Date.now()}`;
  const absent = await sim.findSubmissionByCorrelation(timeoutKey);
  assert.equal(absent.found, false);
}

assert.equal(isPreventivoAccettato({ statoCliente: "accettato" }), true);
assert.equal(isPreventivoAccettato({ statoWorkflow: "acquisito" }), true);
assert.equal(isPreventivoAccettato({ statoCliente: "pending" }), false);
assert.match(mapCicloAttivoError("COMPANY_FISCAL_PROFILE_MISSING"), /Profilo fiscale/);
assert.match(mapCicloAttivoError("FISCAL_DOCUMENT_NOT_VALIDLY_ISSUED"), /fiscalmente valido/);
assert.match(mapCicloAttivoError("SDI_REJECTED"), /scartata/);

assert.equal(parseSdiEvent("ACCEPTED").canonicalEventType, "TECHNICAL_RECEIPT");
assert.equal(parseSdiEvent("DELIVERED", "RC").canonicalEventType, "DELIVERY");
assert.equal(parseSdiEvent("DELIVERY_FAILED", "MC").canonicalEventType, "DELIVERY_UNAVAILABLE");
assert.equal(parseSdiEvent("REJECTED", "NS").canonicalEventType, "REJECTED");

void runSimulatorChecks()
  .then(() => {
    console.log("ciclo-attivo-xml-sdi.test.ts OK");
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
