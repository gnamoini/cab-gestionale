import assert from "node:assert/strict";
import { generateValidatedInvoiceXml, hashInvoiceXml } from "@/lib/accounting/einvoice";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import { baseSnapshot } from "@/lib/accounting/einvoice/__tests__/einvoice-fixture";

function generate(tipo: string, overrides?: Parameters<typeof baseSnapshot>[1]) {
  const snap = baseSnapshot(tipo, overrides);
  const canonical = buildCanonicalFromSnapshot("inv-1", "company-1", snap);
  return generateValidatedInvoiceXml(canonical);
}

const td01 = generate("TD01");
assert.equal(td01.validated, true);
assert.ok(td01.xml.includes("TD01"));
assert.ok(td01.xml.includes("FPR12"));
assert.equal(td01.sha256, hashInvoiceXml(td01.xml));

const td01b = generate("TD01");
assert.equal(td01.xml, td01b.xml, "same input must produce same XML byte-for-byte");

const pec = generate("TD01", {
  cliente: {
    ragione_sociale: "Privato",
    codice_destinatario: "0000000",
    pec: "cliente@pec.it",
    indirizzo: "Via Test 1",
    cap: "00100",
    comune: "Roma",
    provincia: "RM",
    codice_fiscale: "RSSMRA80A01H501U",
  },
});
assert.ok(pec.xml.includes("0000000"));
assert.ok(pec.xml.includes("cliente@pec.it"));

try {
  generate("TD04");
  assert.fail("TD04 without reference should fail");
} catch (e) {
  assert.ok(e instanceof Error);
}

const td04ok = buildCanonicalFromSnapshot("inv-nc", "co", baseSnapshot("TD04"), {
  references: {
    linkedDocuments: [{ type: "fattura_collegata", id: "f1", label: "Fattura 1", number: "1/2026", date: "2026-01-15" }],
  },
});
const nc = generateValidatedInvoiceXml(td04ok);
assert.ok(nc.xml.includes("TD04"));

console.log("golden.test.ts OK");
