import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

assert.ok(fs.existsSync(path.join(ROOT, "docs/document-delivery-map.md")), "document-delivery-map missing");

const proxyRoute = read("app/api/documents/[id]/route.ts");
assert.match(proxyRoute, /deliverDocumentFile/);

const auth = read("lib/documents/document-delivery-auth.server.ts");
assert.match(auth, /verifyServerPageRead/);

const uploadPolicy = read("app/api/documents/upload-policy/route.ts");
assert.match(uploadPolicy, /uploadDocuments/);
assert.match(uploadPolicy, /editWorkOrders/);

const helpers = read("components/gestionale/documenti/documenti-helpers.ts");
assert.doesNotMatch(helpers, /storageCreateSignedUrl/);
assert.match(helpers, /archiveDocumentDeliveryUrl/);

const lavService = read("src/services/lavorazione-documents.service.ts");
assert.doesNotMatch(lavService, /listWithUrls/);

const lavManager = read("components/gestionale/media/lavorazione-documents-manager.tsx");
assert.doesNotMatch(lavManager, /listWithUrls/);

const fetchServer = read("lib/documents/document-fetch-server.ts");
assert.doesNotMatch(fetchServer, /select\s*\(\s*["']\*["']\s*\)/);

const clientDocsHook = read("src/hooks/gestionale/use-client-lavorazione-media-queries.ts");
assert.doesNotMatch(clientDocsHook, /listWithUrls/);

console.log("document-delivery-policy: OK");
