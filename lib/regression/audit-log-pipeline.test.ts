import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// --- Write SSOT ---
const auditLog = read("src/services/internal/audit-log.ts");
assert.match(auditLog, /emitCabSyncEvent/);
assert.match(auditLog, /from\("log_modifiche"\)/);
assert.match(auditLog, /AuditLogWriteError/);

// --- Read SSOT: drawer pages use useLogListQuery ---
const drawerSources = [
  "components/gestionale/lavorazioni/lavorazioni-view.tsx",
  "components/gestionale/mezzi/mezzi-view.tsx",
  "components/fatturazione/fatturazione-view.tsx",
  "components/preventivi/preventivi-view.tsx",
  "components/gestionale/documenti/documenti-view.tsx",
];

for (const rel of drawerSources) {
  const src = read(rel);
  assert.match(src, /useLogListQuery|useUndoableLog|useMagazzinoLogFeed/, `${rel} deve leggere log_modifiche via React Query`);
}

// Preventivi/documenti: no localStorage-only drawer read
const preventivi = read("components/preventivi/preventivi-view.tsx");
const documenti = read("components/gestionale/documenti/documenti-view.tsx");
assert.doesNotMatch(preventivi, /loadPreventiviChangeLog\(\)/);
assert.doesNotMatch(documenti, /loadDocumentiChangeLog\(\)/);
assert.match(preventivi, /useLogListQuery\(\{ entita: "preventivi"/);
assert.match(documenti, /useLogListQuery\(\{ entita: "documenti"/);

// --- Realtime invalidation ---
const invalidate = read("src/lib/react-query/invalidate-targets.ts");
assert.match(invalidate, /log_modifiche:\s*\[QK\.log\]/);

// --- Domain services: core entities write via writeModificaLog ---
const coreServices = [
  "src/services/lavorazioni.service.ts",
  "src/services/mezzi.service.ts",
  "src/services/documenti.service.ts",
  "src/services/preventivi.service.ts",
];

for (const rel of coreServices) {
  assert.match(read(rel), /writeModificaLog/, `${rel} deve chiamare writeModificaLog`);
}

// --- No silent swallow on writeModificaLog in lavorazioni addetto path ---
const lavView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavView, /writeModificaLog/);
assert.doesNotMatch(lavView, /void logEntry\.create/);

// --- lavorazione-documents uses SSOT ---
const lavDocs = read("src/services/lavorazione-documents.service.ts");
assert.match(lavDocs, /writeModificaLog/);
assert.doesNotMatch(lavDocs, /logService\.create/);

// --- Retention fix migration exists ---
const retentionFix = read("supabase/migrations/20261019140000_fix_prune_log_modifiche_retention_old_alias.sql");
assert.match(retentionFix, /prune_row\.entita = new\.entita/);
assert.doesNotMatch(retentionFix, /delete from public\.log_modifiche old\b/);

console.log("audit-log-pipeline.test: OK");
