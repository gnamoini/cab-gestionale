import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const traceSrc = readFileSync(
  join(process.cwd(), "lib/document-capture/pipeline/analyze-trace.server.ts"),
  "utf8",
);
assert.match(traceSrc, /DOCUMENT_CAPTURE_ANALYZE_TRACE/);
assert.match(traceSrc, /DOWNLOAD_STORAGE_OK/);
assert.match(traceSrc, /GEMINI_RESPONSE/);
assert.match(traceSrc, /END_OK/);

console.log("analyze-trace.test.ts OK");
