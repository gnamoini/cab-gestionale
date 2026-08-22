import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const ENGINE = join(ROOT, "lib/report/analytics-engine");

const FORBIDDEN_IN_NEW = [
  "buildInvoicePeriodKpiExtended",
  "countCompletedInRange",
  "sottoScortaCount",
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...walk(p));
    else if (name.name.endsWith(".ts") && !name.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

/** New analytics API/executive must not re-import legacy formula paths directly. */
const guarded = [
  join(ROOT, "lib/report/executive/api/report-executive-api.ts"),
  join(ROOT, "app/api/report/analytics/route.ts"),
  join(ROOT, "lib/report/analytics-engine/api/report-analytics-api.ts"),
];

for (const file of guarded) {
  const src = readFileSync(file, "utf8");
  for (const sym of FORBIDDEN_IN_NEW) {
    assert.ok(!src.includes(sym), `${file} must not import legacy ${sym}`);
  }
}

assert.ok(walk(ENGINE).length >= 10, "analytics-engine folder populated");

console.log("consumer-import-gate.test.ts OK");
