import assert from "node:assert/strict";
import { parseCaptureIngressoIso } from "@/lib/document-capture/capture-ingresso-iso";

assert.equal(parseCaptureIngressoIso("18/06/2024"), "2024-06-18T12:00:00.000Z");
assert.equal(parseCaptureIngressoIso(""), null);
assert.equal(parseCaptureIngressoIso("data invalida"), null);

console.log("capture-ingresso-iso.test.ts OK");
