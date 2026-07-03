/**
 * Listino import — parser column map + meta flag policy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { applyListinoColumnMap, detectListinoColumnMap } from "@/lib/magazzino/listino-import/parse-listino-column-map";
import { buildListinoImportMeta, isRicambioGeneratoDaListino } from "@/lib/magazzino/listino-import/listino-import-meta";
import { enrichListinoRowsWithDuplicates } from "@/lib/magazzino/listino-import/listino-import-duplicate-resolver";

const ROOT = process.cwd();

const matrix = [
  ["Codice", "Descrizione", "Listino"],
  ["ABC123", "Filtro olio", "12,50"],
  ["XYZ999", "Guarnizione", "4.2"],
];

const map = detectListinoColumnMap(matrix);
assert.equal(map.confident, true);
const rows = applyListinoColumnMap(matrix, map);
assert.equal(rows.length, 2);
assert.equal(rows[0]?.codice, "ABC123");
assert.equal(rows[0]?.costo, 12.5);

const enriched = enrichListinoRowsWithDuplicates(rows, [
  {
    id: "dup-1",
    codice: "ABC123",
    entityKey: "abc123",
    costo: 10,
    nome: "Old",
    meta: null,
  },
]);
assert.equal(enriched[0]?.suggestedAction, "skip");
assert.equal(enriched[1]?.suggestedAction, "create");

const meta = buildListinoImportMeta({
  documentoId: "00000000-0000-4000-8000-000000000001",
  documentoNome: "Listino MB",
  batchId: "00000000-0000-4000-8000-000000000002",
});
assert.equal(isRicambioGeneratoDaListino({ listinoImport: meta }), true);

const previewRoute = fs.readFileSync(
  path.join(ROOT, "app/api/magazzino/listino-import/preview/route.ts"),
  "utf8",
);
assert.match(previewRoute, /verifyServerSectionWrite\("magazzino"\)/);
assert.match(previewRoute, /verifyServerSectionRead\("documenti"\)/);

const generatedRoute = fs.readFileSync(
  path.join(ROOT, "app/api/magazzino/listino-import/generated/route.ts"),
  "utf8",
);
assert.match(generatedRoute, /verifyServerPermission\("deleteRecords"\)/);

const spreadsheet = fs.readFileSync(path.join(ROOT, "lib/magazzino/listino-import/parse-listino-spreadsheet.ts"), "utf8");
assert.doesNotMatch(
  fs.readFileSync(path.join(ROOT, "components/gestionale/documenti/listino-import-preview-modal.tsx"), "utf8"),
  /parse-listino-spreadsheet/,
  "xlsx parser must stay server-side only",
);

assert.match(spreadsheet, /xlsx-server/);
assert.match(spreadsheet, /readSpreadsheetWorkbook/);

console.log("listino-import-policy.test.ts OK");
