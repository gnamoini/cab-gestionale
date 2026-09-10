import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx|sql)$/.test(name.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const forbiddenRuntime = [
  /\.from\(["']billing_customers["']\)/,
  /from\s+public\.billing_customers/i,
];

const allowed = [
  "billing-customers-removal-gate.test.ts",
  "20270112120400_billing_customers_migration.sql",
  "20270112120700_billing_customers_removal.sql",
  "CAB_Administrative_Master_Data.md",
  "fase5-pre-migration-audit.sql",
];

const hits: string[] = [];
for (const file of walk(ROOT)) {
  const rel = file.replace(ROOT + "\\", "").replace(ROOT + "/", "");
  if (allowed.some((a) => rel.includes(a))) continue;
  const content = readFileSync(file, "utf8");
  for (const re of forbiddenRuntime) {
    if (re.test(content)) hits.push(`${rel}: ${re}`);
  }
}

assert.equal(hits.length, 0, `billing_customers runtime references remain:\n${hits.join("\n")}`);
console.log("billing-customers-removal-gate.test.ts OK");
