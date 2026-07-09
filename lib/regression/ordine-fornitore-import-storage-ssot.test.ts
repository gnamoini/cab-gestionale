import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IMPORT_DIR = path.join(ROOT, "lib/ordini-fornitori/import");

const analyze = fs.readFileSync(
  path.join(IMPORT_DIR, "ordine-fornitore-import.processor.ts"),
  "utf8",
);
assert.match(analyze, /resolveImportSource/);
assert.match(analyze, /getImportFileBytes|beginImportFileProcessing/);
assert.doesNotMatch(analyze, /fetchArchiveDocumentFileServer/);

const legacyAdapter = path.join(ROOT, "lib/import-sources/legacy-document-source.adapter.ts");
assert.ok(fs.existsSync(legacyAdapter), "legacy adapter isolated under import-sources");

console.log("ordine-fornitore-import-storage-ssot.test.ts OK");
