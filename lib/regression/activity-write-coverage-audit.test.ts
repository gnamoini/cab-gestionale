import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const invoices = read("src/services/invoices.service.ts");
assert.match(invoices, /createCreditNote[\s\S]*writeModificaLog/);
assert.match(invoices, /registerCustomerPaymentMulti[\s\S]*writeModificaLog/);

const ddt = read("src/services/ddt.service.ts");
assert.match(ddt, /createOrReplaceForPreventivo[\s\S]*replaced_for_preventivo/);

const capture = read("lib/document-capture/capture-intervento-write-deps.server.ts");
assert.match(capture, /scheda_lavorazione[\s\S]*azione: "UPDATE"[\s\S]*writeModificaLog/);

const settings = read("src/services/settings-rename-propagation.service.ts");
assert.match(settings, /runBatchedRowUpdates[\s\S]*writeModificaLog/);

const listino = read("lib/magazzino/listino-import/listino-import-execute.server.ts");
assert.match(listino, /writeModificaLog/);

const preventiviImport = read("lib/data-import/entities/preventivi/preventivi-import.plugin.server.ts");
assert.match(preventiviImport, /writeModificaLog/);

const magImport = read("lib/data-import/entities/magazzino/magazzino-import-execute.server.ts");
assert.match(magImport, /writeModificaLog/);

const audit = read("src/services/internal/audit-log.ts");
assert.match(audit, /AuditLogWriteError/);
assert.match(audit, /commitCriticalMutation/);
assert.doesNotMatch(audit, /autore_id assente, log saltato/);

const movimenti = read("src/services/movimenti.service.ts");
assert.match(movimenti, /commitCriticalMutation/);

const magazzino = read("src/services/magazzino.service.ts");
assert.match(magazzino, /commitCriticalMutation/);

console.log("activity-write-coverage-audit.test: OK");
