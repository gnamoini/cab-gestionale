import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(fs.existsSync(path.join(ROOT, "docs/document-intelligence-map.md")), "document-intelligence-map missing");
assert.ok(fs.existsSync(path.join(ROOT, "docs/document-intelligence-performance.md")), "document-intelligence-performance missing");

const previewRoute = read("app/api/documents/[id]/preview/route.ts");
assert.match(previewRoute, /deliverDocumentPreview/);

const previewDeliver = read("lib/documents/document-preview-deliver.server.ts");
assert.match(previewDeliver, /resolveDocumentFileServer/);
assert.match(previewDeliver, /generateDocumentThumbnailBytes/);
assert.doesNotMatch(previewDeliver, /select\s*\(\s*["']\*["']\s*\)/);

const previewResponse = read("lib/documents/document-preview-response.ts");
assert.match(previewResponse, /X-Preview-Status/);
assert.match(previewResponse, /X-Preview-Generate-Ms/);

const uploadPolicy = read("app/api/documents/upload-policy/route.ts");
assert.match(uploadPolicy, /contentHash/);
assert.match(uploadPolicy, /deduplicated/);
assert.match(uploadPolicy, /buildDocumentBlobStoragePath/);

const listView = read("components/gestionale/documenti/documenti-view.tsx");
assert.doesNotMatch(listView, /deliverDocumentFile/);
assert.match(listView, /DocumentThumbnail/);

const thumbnailUi = read("components/gestionale/documenti/document-thumbnail.tsx");
assert.match(thumbnailUi, /IntersectionObserver/);
assert.match(thumbnailUi, /buildDocumentPreviewUrl/);

const listMapper = read("lib/documenti/documenti-list-mapper.ts");
assert.match(listMapper, /hasPreview/);

const deleteFull = read("lib/documenti/delete-documento-fully.ts");
assert.match(deleteFull, /isDocumentBlobStoragePath/);
assert.match(deleteFull, /contentHash/);

const hashClient = read("lib/documents/document-content-hash.ts");
assert.match(hashClient, /SHA-256/);

console.log("document-intelligence-policy: OK");
