import assert from "node:assert/strict";
import { listCaptureExtractionFields } from "@/lib/document-capture/capture-extraction-schema";

assert.deepEqual(
  listCaptureExtractionFields([{ key: "cliente", value: "Rossi", confidence: 0.9 }]),
  [{ key: "cliente", value: "Rossi", confidence: 0.9 }],
);

assert.deepEqual(
  listCaptureExtractionFields({ cliente: { value: "Rossi", confidence: 0.8 } }),
  [{ key: "cliente", value: "Rossi", confidence: 0.8 }],
);

assert.equal(listCaptureExtractionFields([]).length, 0);
assert.equal(listCaptureExtractionFields(null).length, 0);

console.log("capture-extraction-schema.test.ts OK");
