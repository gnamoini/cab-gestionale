import assert from "node:assert/strict";
import {
  isAllowedCaptureMime,
  needsCaptureOfficeConversion,
} from "@/lib/document-capture/mime-allowlist";

assert.equal(needsCaptureOfficeConversion("text/csv"), true);
assert.equal(needsCaptureOfficeConversion("application/pdf"), false);
assert.equal(
  isAllowedCaptureMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
  true,
);
assert.equal(isAllowedCaptureMime("application/zip"), false);

console.log("prepare-capture-bytes-for-ocr.test.ts OK");
