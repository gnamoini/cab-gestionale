import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { mapDocumentCaptureUploadError } from "../document-capture/upload-error-message";
import {
  DOCUMENT_CAPTURE_EPHEMERAL_SOURCE,
  isEphemeralCaptureSource,
} from "../document-capture/ephemeral-capture";

const ROOT = process.cwd();

assert.equal(isEphemeralCaptureSource(DOCUMENT_CAPTURE_EPHEMERAL_SOURCE), true);
assert.equal(isEphemeralCaptureSource("other"), false);

assert.match(
  mapDocumentCaptureUploadError('duplicate key value violates unique constraint "uq_document_capture_company_sha256_finalized"'),
  /già stato usato/i,
);

const finalizeMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910180200_document_capture_ephemeral_finalize_fix.sql"),
  "utf8",
);
assert.match(finalizeMigration, /deletion_reason = 'duplicate_upload'/);
assert.match(finalizeMigration, /'id', v_dup_id/);

const analyzeRetryMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910180300_document_capture_analyze_retry.sql"),
  "utf8",
);
assert.match(analyzeRetryMigration, /failed.*analyzing/);
assert.match(analyzeRetryMigration, /ephemeral_replace/);

const uploadPolicy = fs.readFileSync(
  path.join(ROOT, "app/api/document-capture/upload-policy/route.ts"),
  "utf8",
);
assert.match(uploadPolicy, /purgeUserEphemeralCaptures/);

const launcher = fs.readFileSync(
  path.join(ROOT, "components/document-capture/lavorazioni-digital-capture-launcher.tsx"),
  "utf8",
);
assert.match(launcher, /discardEphemeralCaptureClient/);

console.log("document-capture-ephemeral.test.ts OK");
