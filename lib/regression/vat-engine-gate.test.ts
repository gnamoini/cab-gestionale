import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES_WITH_BUSINESS_IVA22 = [
  "lib/fatturazione/invoice-calculations.ts",
  "components/fatturazione/fatturazione-wizard-modal.tsx",
  "src/services/invoices.service.ts",
  "lib/fatturazione/preventivo-to-invoice-draft.ts",
  "lib/fatturazione/ddt-to-invoice-draft.ts",
];

for (const rel of FILES_WITH_BUSINESS_IVA22) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.doesNotMatch(src, /\?\?\s*22/, `${rel} must not use ?? 22 fallback`);
  assert.doesNotMatch(src, /iva_percent:\s*22/, `${rel} must not hardcode iva_percent: 22`);
}

const invoiceRpc = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270211120300_fase7_invoice_vat_integration.sql"),
  "utf8",
);
assert.match(invoiceRpc, /vat_process_draft_row/);
assert.doesNotMatch(invoiceRpc, /\/\s*1\.22/);

const manifest = fs.readFileSync(path.join(ROOT, "docs/security/rpc-access-manifest.json"), "utf8");
assert.match(manifest, /vat_resolve_configuration/);

console.log("vat-engine-gate.test.ts OK");
