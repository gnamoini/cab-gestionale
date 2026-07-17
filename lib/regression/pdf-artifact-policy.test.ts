import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

assert.ok(exists("docs/pdf-generation-map.md"), "docs/pdf-generation-map.md missing");

const artifactRoute = read("app/api/pdf/artifacts/[type]/route.ts");
assert.match(artifactRoute, /deliverPdfArtifact/);
assert.match(artifactRoute, /export const runtime = "nodejs"/);
assert.match(artifactRoute, /isPdfArtifactType/);

const rbac = read("lib/pdf-artifacts/pdf-artifact-rbac.server.ts");
assert.match(rbac, /verifyServerPageRead/);

const paths = read("lib/pdf-artifacts/pdf-artifact-paths.ts");
assert.match(paths, /dataHash/);
assert.match(paths, /\.pdf/);

const storageConfig = read("src/lib/storage/storage-config.ts");
assert.match(storageConfig, /pdfArtifacts:\s*"pdf-artifacts"/);

const pdfArtifactsBucketMigration = read("supabase/migrations/20260917120100_pdf_artifacts_storage_bucket.sql");
assert.match(pdfArtifactsBucketMigration, /'pdf-artifacts'/);
assert.match(pdfArtifactsBucketMigration, /rbac_storage_pdf_artifacts_select/);

const labelMimeMigration = read(
  "supabase/migrations/20260917120200_pdf_artifacts_inventory_label_mime_types.sql",
);
assert.match(labelMimeMigration, /image\/png/);
assert.match(labelMimeMigration, /image\/svg\+xml/);

const deliverLabel = read("lib/inventory-labels/render/deliver.server.ts");
assert.match(deliverLabel, /uploadLabelArtifactBestEffort/);

const migratedOpeners = [
  "lib/lavorazioni/lavorazioni-list-pdf.ts",
  "lib/preventivi/preventivi-pdf.ts",
  "lib/schede/schede-pdf.ts",
  "lib/dipendenti/pdf/dipendenti-pdf-export.ts",
];

for (const rel of migratedOpeners) {
  const src = read(rel);
  assert.doesNotMatch(src, /from\s+["']jspdf["']/);
  assert.match(src, /openPdfArtifact/);
}

const pdfDataModules = [
  "lib/lavorazioni/lavorazioni-list-fetch-server.ts",
  "lib/report/report-pdf-data.server.ts",
  "lib/preventivi/preventivi-fetch-server.ts",
  "lib/schede/schede-fetch-server.ts",
  "lib/dipendenti/dipendenti-pdf-data.server.ts",
];

for (const rel of pdfDataModules) {
  const src = read(rel);
  assert.doesNotMatch(src, /select\s*\(\s*["']\*["']\s*\)/);
}

const requestArtifact = read("lib/pdf/request-pdf-artifact.ts");
assert.match(requestArtifact, /await fetch\(url/);
assert.match(requestArtifact, /cache:\s*"no-store"/);
assert.match(requestArtifact, /Generazione PDF in corso/);
assert.doesNotMatch(requestArtifact, /downloadFileName/);
const responseHeaders = read("lib/pdf/pdf-artifact-response.ts");
assert.match(responseHeaders, /X-Cache-Status/);
assert.match(responseHeaders, /X-PDF-Generate-Ms/);
assert.match(responseHeaders, /"Cache-Control":\s*"private, no-store, max-age=0"/);
assert.doesNotMatch(responseHeaders, /"Cache-Control":\s*"public[^"]*immutable/);

const generateServer = read("lib/pdf-artifacts/pdf-artifact-generate.server.ts");
assert.match(generateServer, /uploadPdfArtifactBestEffort/);
assert.match(generateServer, /fetchSchedeBundlesStoreServer/);
assert.match(generateServer, /mapLavorazioniListRowsToPdfRows\(lavRows,/);
assert.match(generateServer, /LAVORAZIONI_IN_CORSO_PDF_MAP_VERSION/);

const pdfMap = read("lib/lavorazioni/lavorazioni-pdf-map.ts");
assert.match(pdfMap, /statoLavorazioneLabel/);
assert.match(pdfMap, /prioritaLabel/);
assert.match(pdfMap, /lavorazioneAddettoLabel/);
assert.doesNotMatch(pdfMap, /addetto:\s*"—"/);

console.log("pdf-artifact-policy: OK");
