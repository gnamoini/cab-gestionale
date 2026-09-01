/**
 * Audit statico: nessun fallback catalogo silenzioso nei resolver lista lavorazioni.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const resolveCtx = read("lib/lavorazioni/resolve-lavorazione-context-with-attrezzatura.ts");
const oggetto = read("lib/domain/mezzo-attrezzatura/intervento-oggetto-display.ts");
const filters = read("lib/lavorazioni/lavorazioni-advanced-filters.ts");
const buildCtx = read("lib/domain/intervento-context/build-intervento-context.ts");

assert.doesNotMatch(resolveCtx, /function resolveAttrezzaturaLine/);
assert.doesNotMatch(resolveCtx, /function resolveTelaioLine/);
assert.match(resolveCtx, /resolveInterventoDisplay/);
assert.match(oggetto, /resolveInterventoDisplay/);
assert.match(filters, /resolveInterventoDisplay/);
assert.doesNotMatch(buildCtx, /att\?\.marca\?\.trim\(\)\s*\|\|/);
assert.match(buildCtx, /catalogSnapshotFromInputs/);

console.log("lavorazioni-schede-fallback-scan.test.ts OK");
