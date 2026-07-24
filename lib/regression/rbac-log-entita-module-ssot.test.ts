import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** entita usate da writeModificaLog nel codebase — devono essere mappate in SSOT migration. */
const REQUIRED_ENTITA = [
  "mezzi",
  "attrezzature",
  "lavorazioni",
  "scheda_lavorazione",
  "magazzino_ricambi",
  "movimenti_ricambi",
  "inventory_documents",
  "inventory_document_lines",
  "preventivi",
  "documenti",
  "dipendenti",
  "clienti_anagrafica",
  "invoices",
  "invoice_payments",
  "ddt_documents",
  "ordini_fornitori",
] as const;

const SSOT_MIGRATION = "20261026120400_audit_clienti_rbac_log_entita.sql";

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const sql = read(path.join("supabase/migrations", SSOT_MIGRATION));

for (const entita of REQUIRED_ENTITA) {
  assert.match(
    sql,
    new RegExp(`when\\s+'${entita.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'\\s+then`),
    `${entita} mancante in ${SSOT_MIGRATION}`,
  );
}

const migrationsDir = path.join(ROOT, "supabase/migrations");
const defining: string[] = [];
for (const name of fs.readdirSync(migrationsDir)) {
  if (!name.endsWith(".sql")) continue;
  const content = read(path.join("supabase/migrations", name));
  if (/create\s+or\s+replace\s+function\s+public\.rbac_log_entita_module/i.test(content)) {
    defining.push(name);
  }
}
defining.sort();
const latest = defining[defining.length - 1];
assert.equal(
  latest,
  SSOT_MIGRATION,
  `rbac_log_entita_module: ultima definizione attesa ${SSOT_MIGRATION}, trovata ${latest ?? "nessuna"}`,
);

console.log("rbac-log-entita-module-ssot.test: OK");
