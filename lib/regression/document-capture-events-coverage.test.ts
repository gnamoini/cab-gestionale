import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const files = [
  "app/api/document-capture/upload-policy/route.ts",
  "app/api/document-capture/[id]/finalize/route.ts",
  "app/api/document-capture/[id]/analyze/route.ts",
  "app/api/document-capture/[id]/dry-run/route.ts",
  "app/api/document-capture/[id]/apply/route.ts",
  "app/api/document-capture/[id]/resume/route.ts",
  "app/api/document-capture/[id]/fields/route.ts",
  "lib/document-capture/capture-apply.server.ts",
  "lib/document-capture/analyze-capture.server.ts",
];

for (const rel of files) {
  const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(
    content,
    /mutateCaptureWithEvent|document_capture_|traceDocumentCaptureOperation|requireDocumentCaptureAuth/,
  );
}

const fieldsRoute = fs.readFileSync(
  path.join(ROOT, "app/api/document-capture/[id]/fields/route.ts"),
  "utf8",
);
assert.match(fieldsRoute, /fields_confirmed:\$\{capture\.capture_version\}:\$\{fieldsHash\}/);
assert.doesNotMatch(fieldsRoute, /Date\.now\(\)/);

console.log("document-capture-events-coverage.test.ts OK");
