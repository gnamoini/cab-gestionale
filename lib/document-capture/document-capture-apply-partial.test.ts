import assert from "node:assert/strict";
import { CapturePlanStaleError, hashConfirmedCaptureFields } from "@/lib/document-capture/capture-plan-staleness";
import { resolveFieldsForHash } from "@/lib/document-capture/resolve-fields-for-hash";

const hashA = hashConfirmedCaptureFields([
  { field_key: "cliente", confirmed_value: "ACME" },
  { field_key: "targa", confirmed_value: "AB123CD" },
]);

const hashB = hashConfirmedCaptureFields([
  { field_key: "cliente", confirmed_value: "ACME" },
  { field_key: "targa", confirmed_value: "XY999ZZ" },
]);

assert.notEqual(hashA, hashB);

const hashParity = hashConfirmedCaptureFields(
  resolveFieldsForHash([
    { field_key: "cliente", confirmed_value: null, normalized_value: "ACME" },
    { field_key: "targa", confirmed_value: "AB123CD", normalized_value: "ZZ" },
  ]),
);
assert.equal(
  hashParity,
  hashConfirmedCaptureFields([
    { field_key: "cliente", confirmed_value: "ACME" },
    { field_key: "targa", confirmed_value: "AB123CD" },
  ]),
);

const stale = new CapturePlanStaleError();
assert.equal(stale.code, "PLAN_STALE");

type SagaResult =
  | { ok: true; lavorazioneId: string }
  | { ok: false; stage: string; error: string; lavorazioneId?: string };

function simulateApply(input: {
  persistThrows?: boolean;
  lavorazioneCreated?: boolean;
  seenApplicationIds: Set<string>;
  applicationId: string;
}): { status: string; event: string; lavorazioneId?: string } {
  if (input.seenApplicationIds.has(input.applicationId)) {
    return { status: "applied", event: "noop", lavorazioneId: "lav-existing" };
  }

  let saga: SagaResult = { ok: true, lavorazioneId: "lav-1" };
  if (input.lavorazioneCreated !== false && input.persistThrows) {
    saga = { ok: false, stage: "persist-scheda", error: "scheda fail", lavorazioneId: "lav-1" };
  }

  input.seenApplicationIds.add(input.applicationId);

  if (!saga.ok) {
    return { status: "failed", event: saga.lavorazioneId ? "apply_partial" : "apply_failed" };
  }
  return { status: "applied", event: "apply_committed", lavorazioneId: saga.lavorazioneId };
}

const seen = new Set<string>();
const caseA = simulateApply({ applicationId: "app-a", persistThrows: true, seenApplicationIds: seen });
assert.equal(caseA.status, "failed");
assert.equal(caseA.event, "apply_partial");

const caseB = simulateApply({ applicationId: "app-b", persistThrows: false, seenApplicationIds: seen });
assert.equal(caseB.status, "applied");

const caseC1 = simulateApply({ applicationId: "app-c", seenApplicationIds: seen });
const caseC2 = simulateApply({ applicationId: "app-c", seenApplicationIds: seen });
assert.equal(caseC1.lavorazioneId, "lav-1");
assert.equal(caseC2.lavorazioneId, "lav-existing");

function simulateResume(input: {
  status: string;
  hasPartial: boolean;
  applicationId: string;
  seenApplicationIds: Set<string>;
}): { status: string; event: string } {
  if (input.status !== "failed" || !input.hasPartial) {
    return { status: "failed", event: "resume_rejected" };
  }
  if (input.seenApplicationIds.has(`resume:${input.applicationId}`)) {
    return { status: "applied", event: "noop" };
  }
  input.seenApplicationIds.add(`resume:${input.applicationId}`);
  return { status: "applied", event: "apply_committed" };
}

const resumeSeen = new Set<string>();
const resumeOk = simulateResume({
  status: "failed",
  hasPartial: true,
  applicationId: "app-resume",
  seenApplicationIds: resumeSeen,
});
assert.equal(resumeOk.status, "applied");
assert.equal(resumeOk.event, "apply_committed");

const resumeIdempotent = simulateResume({
  status: "failed",
  hasPartial: true,
  applicationId: "app-resume",
  seenApplicationIds: resumeSeen,
});
assert.equal(resumeIdempotent.event, "noop");

const resumeRejected = simulateResume({
  status: "failed",
  hasPartial: false,
  applicationId: "app-no-partial",
  seenApplicationIds: resumeSeen,
});
assert.equal(resumeRejected.event, "resume_rejected");

console.log("document-capture-apply-partial.test.ts OK");
