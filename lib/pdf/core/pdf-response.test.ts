import assert from "node:assert/strict";
import {
  pdfArtifactEtag,
  pdfArtifactRequestEtagMatches,
  PDF_ARTIFACT_BROWSER_CACHE_MAX_AGE_SEC,
} from "@/lib/pdf/core/pdf-response";

assert.equal(pdfArtifactEtag("abc123def"), '"abc123def"');
assert.equal(PDF_ARTIFACT_BROWSER_CACHE_MAX_AGE_SEC, 300);

const req = new Request("http://localhost/api/pdf/artifacts/preventivo?id=x", {
  headers: { "if-none-match": '"deadbeef"' },
});
assert.equal(pdfArtifactRequestEtagMatches(req, "deadbeef"), true);
assert.equal(pdfArtifactRequestEtagMatches(req, "other"), false);

console.log("pdf-response.test.ts ok");
