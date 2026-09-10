import assert from "node:assert/strict";
import { generateValidatedInvoiceXml } from "@/lib/accounting/einvoice";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import { baseSnapshot } from "@/lib/accounting/einvoice/__tests__/einvoice-fixture";

const priorFetch = globalThis.fetch;
globalThis.fetch = (() => {
  throw new Error("network disabled");
}) as typeof fetch;

try {
  const canonical = buildCanonicalFromSnapshot("inv", "co", baseSnapshot("TD01"));
  const result = generateValidatedInvoiceXml(canonical);
  assert.equal(result.validated, true);
} finally {
  globalThis.fetch = priorFetch;
}

console.log("xsd-offline.test.ts OK");
