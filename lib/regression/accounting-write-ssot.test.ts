import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "components", "lib", "app/api"] as const;

const FORBIDDEN_ENTRY_WRITE =
  /\.from\(\s*["']accounting_entries["']\s*\)[\s\S]{0,120}\.(insert|update|delete|upsert)\s*\(/;
const FORBIDDEN_LINE_WRITE =
  /\.from\(\s*["']accounting_entry_lines["']\s*\)[\s\S]{0,120}\.(insert|update|delete|upsert)\s*\(/;

const ALLOWLIST = new Set([
  path.normalize("lib/accounting/accounting-engine.server.ts"),
]);

function walkTsFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(abs, ent.name);
    if (ent.isDirectory()) out.push(...walkTsFiles(path.relative(ROOT, p)));
    else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith(".test.ts")) {
      out.push(path.relative(ROOT, p));
    }
  }
  return out;
}

for (const rel of SCAN_DIRS.flatMap(walkTsFiles)) {
  const norm = path.normalize(rel);
  if (ALLOWLIST.has(norm)) continue;
  const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (FORBIDDEN_ENTRY_WRITE.test(content)) {
    assert.fail(`${rel}: direct write on accounting_entries forbidden; use accounting-engine.server.ts`);
  }
  if (FORBIDDEN_LINE_WRITE.test(content)) {
    assert.fail(`${rel}: direct write on accounting_entry_lines forbidden; use accounting-engine.server.ts`);
  }
}

console.log("accounting-write-ssot.test.ts OK");
