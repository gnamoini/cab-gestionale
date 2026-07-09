import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

assert.ok(fs.existsSync(path.join(ROOT, "app/(gestionale)/fatturazione/page.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "components/fatturazione/fatturazione-view.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "components/fatturazione/fatturazione-fatture-section.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/fatturazione/fatturazione-sections-config.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260910150000_fatturazione_erp_phase1a.sql")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260910150500_fatturazione_status_axes_ssot.sql")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/fatturazione/ddt-to-invoice-draft.ts")));

const view = fs.readFileSync(path.join(ROOT, "components/fatturazione/fatturazione-view.tsx"), "utf8");
assert.match(view, /GestionaleSectionGate module="fatturazione"/);
assert.match(view, /FatturazioneHubNav/);
assert.match(view, /FatturazioneFattureSection/);
assert.match(view, /parseFatturazioneTab/);
assert.match(view, /fattOpen/);

const service = fs.readFileSync(path.join(ROOT, "src/services/invoices.service.ts"), "utf8");
assert.doesNotMatch(service, /\.update\(\{\s*status\s*:/);
assert.match(service, /invoiceApplyTransition/);
assert.doesNotMatch(service, /updateDraft[\s\S]*"status"/);

const ssot = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910150500_fatturazione_status_axes_ssot.sql"),
  "utf8",
);
assert.match(ssot, /invoice_write_status_axes/);
assert.match(ssot, /invoice_guard_direct_axes_update/);

const regPayFn = ssot.slice(ssot.indexOf("create or replace function public.register_invoice_payment"));
assert.match(regPayFn, /invoice_write_status_axes/);

console.log("fatturazione-module-isolation.test.ts OK");
