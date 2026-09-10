import assert from "node:assert/strict";
import { generateValidatedInvoiceXml } from "@/lib/accounting/einvoice";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import { baseSnapshot } from "@/lib/accounting/einvoice/__tests__/einvoice-fixture";

// Pure engine must not accept arbitrary XML strings — only canonical model path.
const canonical = buildCanonicalFromSnapshot("inv", "co", baseSnapshot("TD01"));
assert.throws(() => {
  (generateValidatedInvoiceXml as unknown as (x: string) => void)("<xml/>");
});

// Client cannot override fiscal totals via canonical without going through snapshot SSOT in app boundary.
const tampered = buildCanonicalFromSnapshot("inv", "co", baseSnapshot("TD01"));
tampered.totals.grossAmount = 999999;
assert.throws(() => generateValidatedInvoiceXml(tampered));

console.log("security.test.ts OK");
