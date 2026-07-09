import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IMPORT_FILES_DIR = path.join(ROOT, "lib/import-files");

const FORBIDDEN_IMPORT_PATTERNS = [
  /@\/lib\/ordini-fornitori\//,
  /@\/lib\/lavorazioni\//,
  /@\/lib\/magazzino\//,
  /@\/lib\/documenti\//,
  /@\/lib\/preventivi\//,
  /@\/lib\/import-sources\//,
];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(abs));
      continue;
    }
    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(abs);
    }
  }
  return out;
}

for (const abs of collectTsFiles(IMPORT_FILES_DIR)) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
  const src = fs.readFileSync(abs, "utf8");
  for (const re of FORBIDDEN_IMPORT_PATTERNS) {
    assert.doesNotMatch(src, re, `${rel} must not import domain module ${re}`);
  }
}

console.log("import-file-service-contract.test.ts OK");
