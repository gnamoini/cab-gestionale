import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

assert.ok(fs.existsSync(path.join(ROOT, "app/(gestionale)/fatturazione/page.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "components/fatturazione/fatturazione-view.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "components/fatturazione/fatturazione-wizard-modal.tsx")));

const view = fs.readFileSync(path.join(ROOT, "components/fatturazione/fatturazione-view.tsx"), "utf8");
assert.match(view, /GestionaleSectionGate module="fatturazione"/);
assert.match(view, /FatturazioneKpiGrid/);
assert.match(view, /GestionaleListTable/);

const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260717130000_user_permissions_fatturazione_dipendenti.sql"),
  "utf8",
);
assert.ok(fs.existsSync(
  path.join(ROOT, "supabase/migrations/20260717150000_invoices_update_draft_rpc.sql"),
));

console.log("fatturazione-module-isolation.test.ts OK");
