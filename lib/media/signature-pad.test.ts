import assert from "node:assert/strict";
import { hasSignatureDataUrl } from "@/lib/media/signature-pad";

assert.equal(hasSignatureDataUrl("data:image/png;base64,abc"), true);
assert.equal(hasSignatureDataUrl(""), false);
assert.equal(hasSignatureDataUrl(undefined), false);

console.log("signature-pad.test.ts OK");
