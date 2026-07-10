/**
 * Listino import — parser column map + meta flag policy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { applyListinoColumnMap, detectListinoColumnMap } from "@/lib/magazzino/listino-import/parse-listino-column-map";
import {
  canImportListinoFromDocumento,
  isListinoImportSupportedFileName,
  isListinoImportSupportedDocument,
} from "@/lib/magazzino/listino-import/listino-import-client";
import { buildListinoImportMeta, isRicambioGeneratoDaListino } from "@/lib/magazzino/listino-import/listino-import-meta";
import { enrichListinoRowsWithDuplicates } from "@/lib/magazzino/listino-import/listino-import-duplicate-resolver";
import { resolveListinoPdfPagesPerChunk } from "@/lib/magazzino/listino-import/listino-import-types";

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

assert.equal(resolveListinoPdfPagesPerChunk(4), 4);
assert.ok(resolveListinoPdfPagesPerChunk(50) >= 5);
assert.ok(resolveListinoPdfPagesPerChunk(200) > resolveListinoPdfPagesPerChunk(50));

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

const listinoDoc = {
  categoria: "listini" as const,
  nome: "LISTINO SCHMIDT 2026.pdf",
  urlBlob: "",
  urlDocumento: "documenti/schmidt/listino.pdf",
};
assert.equal(
  canImportListinoFromDocumento(listinoDoc, { canReadDocumenti: true, canWriteMagazzino: true }),
  true,
);
assert.equal(
  canImportListinoFromDocumento({ ...listinoDoc, categoria: "cataloghi" }, {
    canReadDocumenti: true,
    canWriteMagazzino: true,
  }),
  false,
);
assert.equal(
  canImportListinoFromDocumento(listinoDoc, { canReadDocumenti: false, canWriteMagazzino: true }),
  false,
);
assert.equal(isListinoImportSupportedFileName("listino.docx"), false);
assert.equal(
  isListinoImportSupportedDocument({
    nome: "LISTINO RICAMBI OMB 2026",
    tipoFile: "pdf",
    fileEstensione: "pdf",
    urlDocumento: "blobs/ab/hash",
  }),
  true,
);

const previewRoute = fs.readFileSync(
  path.join(ROOT, "app/api/magazzino/listino-import/preview/route.ts"),
  "utf8",
);
assert.match(previewRoute, /verifyServerPageWrite\("magazzino"\)/);
assert.match(previewRoute, /verifyServerPageRead\("documenti"\)/);

const generatedRoute = fs.readFileSync(
  path.join(ROOT, "app/api/magazzino/listino-import/generated/route.ts"),
  "utf8",
);
assert.match(generatedRoute, /verifyServerPageWrite\("magazzino"\)/);

const spreadsheet = fs.readFileSync(path.join(ROOT, "lib/magazzino/listino-import/parse-listino-spreadsheet.ts"), "utf8");
assert.doesNotMatch(
  fs.readFileSync(path.join(ROOT, "components/gestionale/documenti/listino-import-preview-modal.tsx"), "utf8"),
  /parse-listino-spreadsheet/,
  "xlsx parser must stay server-side only",
);

assert.match(spreadsheet, /xlsx-server/);
assert.match(spreadsheet, /readSpreadsheetWorkbook/);

const documentiView = fs.readFileSync(
  path.join(ROOT, "components/gestionale/documenti/documenti-view.tsx"),
  "utf8",
);
assert.match(documentiView, /canImportListinoFromDocumento/);
assert.match(documentiView, /showImportListino=\{showListinoImportForDoc/);
assert.match(documentiView, /Importa in magazzino/);

const magazzinoView = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/magazzino-view.tsx"),
  "utf8",
);
assert.match(magazzinoView, /MagazzinoListinoAiBadge/);
assert.match(magazzinoView, /listinoImport=\{p\.listinoImport\}/);

const previewModal = fs.readFileSync(
  path.join(ROOT, "components/gestionale/documenti/listino-import-preview-modal.tsx"),
  "utf8",
);
assert.match(previewModal, /validateListinoImportRows/);
assert.match(previewModal, /LISTINO_IMPORT_ROW_INPUT/);
assert.match(previewModal, /Avvia analisi/);
assert.match(previewModal, /Vuoi avviare l/);
assert.match(previewModal, /LoadingProgressBar/);

const listinoAnalysis = fs.readFileSync(path.join(ROOT, "lib/ai/listino-import-analysis.ts"), "utf8");
assert.match(listinoAnalysis, /GEMINI_FILE_ANALYSIS_TIMEOUT_MS/);
assert.match(listinoAnalysis, /isGeminiAuthError/);
assert.match(listinoAnalysis, /splitPdfIntoPageRangeChunks/);
assert.match(listinoAnalysis, /resolveListinoPdfPagesPerChunk/);
assert.doesNotMatch(listinoAnalysis, /AbortSignal\.timeout\(60_000\)/);
const pdfFn = listinoAnalysis.match(
  /export async function parseListinoPdfWithAi[\s\S]*?(?=\nexport async function mapListinoColumnsWithAi)/,
)?.[0];
assert.ok(pdfFn, "parseListinoPdfWithAi must exist");
assert.match(pdfFn, /splitPdfIntoPageRangeChunks/);
assert.match(listinoAnalysis, /parseListinoPdfChunkWithAi[\s\S]*?GEMINI_FILE_ANALYSIS_TIMEOUT_MS/);
assert.doesNotMatch(
  listinoAnalysis.match(/async function parseListinoPdfChunkWithAi[\s\S]*?(?=\nasync function parseChunkWithSplitRetry)/)?.[0] ?? "",
  /AbortSignal\.timeout\(\d+_?\d*\)/,
);
assert.match(listinoAnalysis, /runChunksSequential/);
assert.match(previewRoute, /maxDuration\s*=\s*600/);

const listinoTypes = fs.readFileSync(
  path.join(ROOT, "lib/magazzino/listino-import/listino-import-types.ts"),
  "utf8",
);
assert.match(listinoTypes, /LISTINO_PDF_PAGES_PER_CHUNK/);
assert.match(listinoTypes, /LISTINO_PDF_MAX_CHUNKS/);
assert.match(listinoTypes, /categorieDisponibili/);
assert.match(listinoTypes, /categoria\?: string/);

const listinoExecute = fs.readFileSync(
  path.join(ROOT, "lib/magazzino/listino-import/listino-import-execute.server.ts"),
  "utf8",
);
assert.doesNotMatch(listinoExecute, /categoria:\s*"Generale"/);
assert.match(listinoExecute, /resolveMagazzinoCategoriaFromMaster/);

const listinoDeleteGenerated = fs.readFileSync(
  path.join(ROOT, "lib/magazzino/listino-import/listino-import-delete-generated.server.ts"),
  "utf8",
);
assert.match(listinoDeleteGenerated, /LISTINO_IMPORT_DELETE_IN_CHUNK/);
assert.match(listinoDeleteGenerated, /meta->listinoImport->>generatoAutomaticamente/);
assert.match(listinoDeleteGenerated, /chunkIds/);

const listinoPreview = fs.readFileSync(
  path.join(ROOT, "lib/magazzino/listino-import/listino-import-preview.server.ts"),
  "utf8",
);
assert.match(listinoPreview, /assignListinoImportCategorie/);

assert.match(previewModal, /Categoria/);
assert.match(previewModal, /categoriaItems/);

console.log("listino-import-policy.test.ts OK");
