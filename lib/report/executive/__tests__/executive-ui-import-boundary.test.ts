import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const executiveDir = path.join(ROOT, "components/report/executive");

function readTsFiles(dir: string): string {
  if (!fs.existsSync(dir)) return "";
  const parts: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      parts.push(readTsFiles(abs));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      parts.push(fs.readFileSync(abs, "utf8"));
    }
  }
  return parts.join("\n");
}

const src = readTsFiles(executiveDir);

for (const re of [
  /from\s+["']@\/lib\/report\/metrics\/report-metric-registry/,
  /from\s+["']@\/lib\/report\/datasets/,
  /buildLavorazioniDataset/,
  /buildEconomicoDataset/,
  /buildMagazzinoDataset/,
]) {
  assert.doesNotMatch(src, re, `executive UI must not import forbidden layer ${re}`);
}

console.log("executive-ui-import-boundary.test.ts OK");
