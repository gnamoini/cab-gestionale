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

assert.ok(exists("docs/audit-pdf-system.md"), "docs/audit-pdf-system.md missing");

const masterReport = read("docs/technical-audit-report.md");
assert.match(masterReport, /audit-pdf-system\.md/);

const previewRoute = read("app/api/pdf/preview/route.ts");
assert.match(previewRoute, /handlePdfPreviewPost/);

const legacyRoute = read("app/api/preventivi/pdf-anteprima/route.ts");
assert.match(legacyRoute, /deprecated:\s*true/);
assert.match(legacyRoute, /PDF_PREVIEW_API_PATH/);

const openPreview = read("lib/pdf/open-pdf-blob-preview.ts");
assert.match(openPreview, /PDF_PREVIEW_API_PATH/);
assert.match(openPreview, /Apertura PDF in corso/);
assert.match(openPreview, /Apertura locale/);

const handler = read("lib/pdf/pdf-preview-handler.ts");
assert.match(handler, /PDF_MAGIC/);
assert.match(handler, /can_read_operational/);

const bunderPdf = read("lib/bunder/bunder-pdf.ts");
assert.match(bunderPdf, /openPdfBlobInNewTab/);
assert.doesNotMatch(bunderPdf, /openUrlInNewTab/);

assert.ok(!exists("lib/preventivi/pdf-preview-cache.ts"), "pdf-preview-cache.ts should be removed");

const schedePrint = read("lib/schede/schede-print-html.ts");
assert.doesNotMatch(schedePrint, /openSchedaPrintWindow/);

console.log("pdf-preview-policy: OK");
