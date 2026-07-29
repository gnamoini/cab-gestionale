import assert from "node:assert/strict";
import {
  markCaptureCompileFieldDirty,
  mergeCaptureCompileFieldsRespectingDirty,
} from "@/lib/document-capture/capture-compile-field-dirty";

const dirty = markCaptureCompileFieldDirty({}, "targa");
const merged = mergeCaptureCompileFieldsRespectingDirty({
  current: { targa: "AA111BB", cliente: "Old" } as import("@/types/schede").SchedaIngressoFields,
  incoming: { targa: "AI-TARGA", cliente: "New" } as import("@/types/schede").SchedaIngressoFields,
  dirty,
});

assert.equal(merged.targa, "AA111BB");
assert.equal(merged.cliente, "New");

console.log("capture-compile-field-dirty.test.ts OK");
