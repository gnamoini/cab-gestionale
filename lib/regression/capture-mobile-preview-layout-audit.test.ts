/**
 * Audit layout anteprima capture su mobile — niente zoom/pan che espande la griglia.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const preview = read("components/document-capture/capture-document-file-preview.tsx");
const zoom = read("components/document-capture/capture-document-zoom-pan-viewport.tsx");
const review = read("components/document-capture/capture-review-panel.tsx");

assert.match(preview, /useMaxMdDown/);
assert.match(preview, /enableZoomPan = !compact && !isMobile/);
assert.match(preview, /overflow-x-hidden/);
assert.match(preview, /object-contain/);
assert.match(zoom, /min-w-0 max-w-full/);
assert.match(zoom, /overflow-x-hidden/);
assert.match(review, /overflow-x-hidden/);

console.log("capture-mobile-preview-layout-audit.test.ts OK");
