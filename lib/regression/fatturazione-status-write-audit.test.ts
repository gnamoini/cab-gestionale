import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "components/fatturazione", "lib/fatturazione", "app/api"] as const;

const FORBIDDEN_INVOICE_UPDATE = /\.from\(\s*["']invoices["']\s*\)[\s\S]{0,120}\.update\(\s*\{[^}]*\b(status|document_status|payment_status|sdi_status)\b/s;
const FORBIDDEN_EVENT_INSERT = /\.from\(\s*["']invoice_events["']\s*\)\s*\.insert\s*\(/;

const ALLOWLIST_FILES = new Set([
  path.normalize("lib/fatturazione/invoice-events.ts"),
]);

function walkTsFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(abs, ent.name);
    if (ent.isDirectory()) out.push(...walkTsFiles(path.relative(ROOT, p)));
    else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith(".test.ts")) out.push(path.relative(ROOT, p));
  }
  return out;
}

const files = SCAN_DIRS.flatMap(walkTsFiles);

for (const rel of files) {
  const norm = path.normalize(rel);
  const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (FORBIDDEN_INVOICE_UPDATE.test(content)) {
    assert.fail(`${rel}: aggiornamento diretto assi/status su invoices vietato`);
  }
  if (FORBIDDEN_EVENT_INSERT.test(content) && !ALLOWLIST_FILES.has(norm)) {
    assert.fail(`${rel}: INSERT diretto su invoice_events vietato; usare appendBillingEvent`);
  }
}

console.log("fatturazione-status-write-audit.test.ts OK");
