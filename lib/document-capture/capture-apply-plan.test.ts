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

const ingressoOnly = [
  { field_key: "cliente", confirmed_value: "ACME", normalized_value: "ACME" },
  { field_key: "data_ingresso", confirmed_value: "01/01/2024", normalized_value: "01/01/2024" },
  { field_key: "descrizione_anomalia", confirmed_value: "Guasto", normalized_value: "Guasto" },
];

const ingressoPlan = buildCaptureApplyPlanFromFields({
  fields: ingressoOnly,
  lavorazioneId: null,
  mezzoId: null,
  attrezzaturaId: null,
  createdBy: "test",
});
assert.equal(ingressoPlan.creates.lavorazioniScheda, false);
assert.equal(ingressoPlan.creates.ricambiScheda, false);
assert.equal(ingressoPlan.bundlePreview?.lavorazioni, null);
assert.equal(ingressoPlan.bundlePreview?.ricambi, null);

const ingressoLavPlan = buildCaptureApplyPlanFromFields({
  fields: [...ingressoOnly, { field_key: "riga_1_lavorazione", confirmed_value: "Rip", normalized_value: "Rip" }],
  lavorazioneId: null,
  mezzoId: null,
  attrezzaturaId: null,
  createdBy: "test",
});
assert.equal(ingressoLavPlan.creates.lavorazioniScheda, true);
assert.equal(ingressoLavPlan.creates.ricambiScheda, false);

const allThreePlan = buildCaptureApplyPlanFromFields({
  fields: [
    ...ingressoOnly,
    { field_key: "riga_1_lavorazione", confirmed_value: "Rip", normalized_value: "Rip" },
    { field_key: "riga_1_codice", confirmed_value: "ABC", normalized_value: "ABC" },
  ],
  lavorazioneId: null,
  mezzoId: null,
  attrezzaturaId: null,
  createdBy: "test",
});
assert.equal(allThreePlan.creates.lavorazioniScheda, true);
assert.equal(allThreePlan.creates.ricambiScheda, true);

const ricambiOnlyPlan = buildCaptureApplyPlanFromFields({
  fields: [
    { field_key: "scheda_tipo", confirmed_value: "ricambi", normalized_value: "ricambi" },
    { field_key: "riga_1_codice", confirmed_value: "X", normalized_value: "X" },
  ],
  lavorazioneId: "lav-1",
  mezzoId: null,
  attrezzaturaId: null,
  createdBy: "test",
});
assert.equal(ricambiOnlyPlan.creates.mezzo, true);
assert.equal(ricambiOnlyPlan.creates.lavorazioniScheda, false);
assert.equal(ricambiOnlyPlan.creates.ricambiScheda, true);

const partialJsonPlan = buildCaptureApplyPlanFromFields({
  fields: ingressoOnly,
  lavorazioneId: null,
  mezzoId: null,
  attrezzaturaId: null,
  approvedCreates: { mezzo: true },
  createdBy: "test",
});
assert.equal(partialJsonPlan.creates.lavorazioniScheda, false);
assert.equal(partialJsonPlan.creates.ricambiScheda, false);

console.log("capture-apply-plan.test.ts OK");
