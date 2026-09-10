import assert from "node:assert/strict";
import { generateValidatedInvoiceXml, hashInvoiceXml, generateInvoiceXmlFilename } from "@/lib/accounting/einvoice";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import { baseSnapshot } from "@/lib/accounting/einvoice/__tests__/einvoice-fixture";

const snap = baseSnapshot("TD01");
const c1 = buildCanonicalFromSnapshot("a", "b", snap);
const c2 = buildCanonicalFromSnapshot("a", "b", snap);
const x1 = generateValidatedInvoiceXml(c1);
const x2 = generateValidatedInvoiceXml(c2);
assert.equal(x1.xml, x2.xml);
assert.equal(x1.sha256, x2.sha256);
assert.equal(generateInvoiceXmlFilename(c1), generateInvoiceXmlFilename(c2));

const c3 = buildCanonicalFromSnapshot("a", "b", baseSnapshot("TD01", {
  documento: { tipo_documento: "TD01", numero: 99, anno: 2026, data_emissione: "2026-03-01" },
}));
const x3 = generateValidatedInvoiceXml(c3);
assert.notEqual(x1.xml, x3.xml);

assert.throws(() => generateValidatedInvoiceXml({
  ...c1,
  supplier: { ...c1.supplier, denomination: "" },
}));

console.log("invariants.test.ts OK");
