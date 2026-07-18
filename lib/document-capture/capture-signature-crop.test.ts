import assert from "node:assert/strict";
import { shouldExtractCaptureSignatures } from "@/lib/document-capture/capture-signature-crop";

assert.equal(shouldExtractCaptureSignatures("ingresso", []), true);
assert.equal(shouldExtractCaptureSignatures("lavorazioni", ["cliente"]), false);
assert.equal(
  shouldExtractCaptureSignatures("lavorazioni", ["cliente", "data_ingresso"]),
  true,
);
assert.equal(shouldExtractCaptureSignatures(null, ["riga_1_nome"]), false);
assert.equal(
  shouldExtractCaptureSignatures(null, ["riga_1_nome", "cliente", "data_ingresso"]),
  true,
);
assert.equal(shouldExtractCaptureSignatures(null, ["cliente", "data_ingresso"]), true);
assert.equal(shouldExtractCaptureSignatures(null, []), true);

console.log("capture-signature-crop.test.ts OK");
