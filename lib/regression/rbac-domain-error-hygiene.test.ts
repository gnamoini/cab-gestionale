/**
 * Domain services must not import RBAC denial messages (use entry boundary).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SERVICES_DIR = path.join(ROOT, "src/services");

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".service.ts")) out.push(full);
  }
}

const files: string[] = [];
walk(SERVICES_DIR, files);
const violations: string[] = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf8");
  if (/from "@\/src\/lib\/auth\/permission-guards"/.test(src) && /ensurePageWrite|ensurePageRead|ensureModuleCan/.test(src)) {
    violations.push(`${rel}: service still imports RBAC guards`);
  }
}

assert.equal(violations.length, 0, violations.join("\n"));
console.log("rbac-domain-error-hygiene.test.ts OK");
