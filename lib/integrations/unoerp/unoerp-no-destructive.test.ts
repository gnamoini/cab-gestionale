import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "lib/integrations/unoerp");

function walk(dir: string, out: string[]): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
}

const files: string[] = [];
walk(DIR, files);
const hits: string[] = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  if (/deleteRecord\s*\(/.test(src)) hits.push(`${f}: deleteRecord`);
  if (/act\s*[:=]\s*["']delete["']/.test(src)) hits.push(`${f}: act=delete`);
  if (/act\s*[:=]\s*["']cancel["']/.test(src)) hits.push(`${f}: act=cancel`);
}

assert.equal(hits.length, 0, hits.join("\n"));
console.log(`unoerp-no-destructive.test.ts: ok (${files.length} files)`);
