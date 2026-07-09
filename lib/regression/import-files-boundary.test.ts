import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const importFilesDir = path.join(ROOT, "lib/import-files");

function readAll(dir: string): string {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .join("\n");
}

const importFilesSrc = readAll(importFilesDir);

for (const re of [
  /@\/lib\/ordini-fornitori\//,
  /@\/lib\/lavorazioni\//,
  /@\/lib\/magazzino\//,
  /@\/lib\/preventivi\//,
  /@\/lib\/documenti\//,
  /@\/lib\/import-sources\//,
]) {
  assert.doesNotMatch(importFilesSrc, re, `import-files must not import ${re}`);
}

const ordiniImportDir = path.join(ROOT, "lib/ordini-fornitori/import");
const ordiniFiles = fs
  .readdirSync(ordiniImportDir)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  .map((f) => path.join(ordiniImportDir, f));

const FORBIDDEN_ORDINI = [
  /uploadDocumentoFile/,
  /documentiEntry\.create/,
  /registerImportPreventivoDocumento/,
  /finalize-ordine-fornitore-import-document/,
];

for (const abs of ordiniFiles) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
  const src = fs.readFileSync(abs, "utf8");
  for (const re of FORBIDDEN_ORDINI) {
    assert.doesNotMatch(src, re, `${rel} must not use document upload path ${re}`);
  }
}

const processor = fs.readFileSync(path.join(ordiniImportDir, "ordine-fornitore-import.processor.ts"), "utf8");
assert.match(processor, /resolveImportSource/);
assert.match(processor, /beginImportFileProcessing/);

console.log("import-files-boundary.test.ts OK");
