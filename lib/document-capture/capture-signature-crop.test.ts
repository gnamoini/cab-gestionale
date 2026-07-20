import assert from "node:assert/strict";
import {
  CAPTURE_AI_SIGNATURE_EXTRACTION_ENABLED,
  shouldExtractCaptureSignatures,
} from "@/lib/document-capture/capture-signature-crop";

assert.equal(CAPTURE_AI_SIGNATURE_EXTRACTION_ENABLED, false);
assert.equal(shouldExtractCaptureSignatures("ingresso", []), false);
assert.equal(shouldExtractCaptureSignatures("lavorazioni", ["cliente", "data_ingresso"]), false);
assert.equal(shouldExtractCaptureSignatures(null, ["cliente", "data_ingresso"]), false);

console.log("capture-signature-crop.test.ts OK");
