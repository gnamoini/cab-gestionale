import assert from "node:assert/strict";
import {
  assertCapturePlanFresh,
  buildCaptureApplyPlanFromFields,
  hashCaptureFieldsRows,
} from "@/lib/document-capture/capture-apply-plan";
import { CapturePlanStaleError } from "@/lib/document-capture/capture-plan-staleness";
import { resolveFieldValueForHash } from "@/lib/document-capture/resolve-fields-for-hash";

const fields = [
  { field_key: "cliente", confirmed_value: null, normalized_value: "ACME" },
  { field_key: "targa", confirmed_value: "AB123CD", normalized_value: "AB123CD" },
];

assert.equal(resolveFieldValueForHash(fields[0]!), "ACME");
assert.equal(resolveFieldValueForHash(fields[1]!), "AB123CD");

const hashFromNormalized = hashCaptureFieldsRows(fields);
const hashFromConfirmed = hashCaptureFieldsRows([
  { field_key: "cliente", confirmed_value: "ACME", normalized_value: "OTHER" },
  { field_key: "targa", confirmed_value: "AB123CD", normalized_value: "XY" },
]);

assert.equal(hashFromNormalized, hashFromConfirmed);

const plan = buildCaptureApplyPlanFromFields({
  fields,
  lavorazioneId: null,
  mezzoId: null,
  attrezzaturaId: null,
  createdBy: "test",
});
assert.equal(plan.creates.mezzo, true);
assert.equal(plan.updates.ingressoFields.cliente, "ACME");

assert.throws(
  () =>
    assertCapturePlanFresh({
      applicationCaptureVersion: 1,
      applicationCaptureUpdatedAt: "a",
      applicationSourceFieldsHash: "x",
      captureCaptureVersion: 2,
      captureUpdatedAt: "a",
      currentFieldsHash: "x",
    }),
  CapturePlanStaleError,
);

const sharedHash = "fields-hash-abc";
const preMutateSnapshot = {
  applicationCaptureVersion: 3,
  applicationCaptureUpdatedAt: "2026-07-20T10:00:00.000Z",
  applicationSourceFieldsHash: sharedHash,
  captureCaptureVersion: 4,
  captureUpdatedAt: "2026-07-20T10:00:01.000Z",
  currentFieldsHash: sharedHash,
};

assert.throws(() => assertCapturePlanFresh(preMutateSnapshot), CapturePlanStaleError);

const postMutateSnapshot = {
  ...preMutateSnapshot,
  applicationCaptureVersion: 4,
  applicationCaptureUpdatedAt: "2026-07-20T10:00:01.000Z",
};

assert.doesNotThrow(() => assertCapturePlanFresh(postMutateSnapshot));

console.log("capture-apply-plan.test.ts OK");
