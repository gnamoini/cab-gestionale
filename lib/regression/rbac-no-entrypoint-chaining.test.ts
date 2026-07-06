/**
 * Entrypoint chaining guard: *-entry.ts must not import another *-entry.ts (single auth boundary).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENTRY_DIR = path.join(ROOT, "lib/domain");
const ENTRY_IMPORT_RE = /from\s+["']@\/lib\/domain\/[^"']+-entry["']/;

const violations: string[] = [];

for (const name of fs.readdirSync(ENTRY_DIR)) {
  if (!name.endsWith("-entry.ts")) continue;
  const file = path.join(ENTRY_DIR, name);
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  for (const line of src.split("\n")) {
    if (ENTRY_IMPORT_RE.test(line) && !line.includes(name.replace(".ts", ""))) {
      violations.push(`${rel}: chains entrypoint → ${line.trim()}`);
    }
  }
}

assert.equal(violations.length, 0, `entrypoint chaining:\n${violations.join("\n")}`);
console.log("rbac-no-entrypoint-chaining.test.ts OK");
