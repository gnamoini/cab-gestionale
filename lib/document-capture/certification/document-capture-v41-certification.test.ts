import assert from "node:assert/strict";
import { assertApplyPlanFresh, StaleApplyPlanError } from "@/lib/document-capture/apply/apply-plan-v41-gate";
import { STALE_APPLY_PLAN_ERROR_CODE } from "@/lib/document-capture/model/apply-plan-v41";
import { hashDocumentModelContent } from "@/lib/document-capture/model/document-model-hash";
import type { DigitalDocument } from "@/lib/document-capture/model/document-model";
import { buildPipelineIdempotencyKey } from "@/lib/document-capture/orchestrator/pipeline-orchestrator";

const doc: DigitalDocument = {
  id: "c1",
  documentType: "scheda_officina_bundle",
  completeness: "unknown",
  metadata: {
    schemaVersion: "1.0",
    migrationVersion: "1",
    documentModelVersion: "1.0.0",
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "test",
    contentHash: "",
  },
  pages: [{ index: 0, physical: { isEmpty: false }, sections: [] }],
};
doc.metadata.contentHash = hashDocumentModelContent(doc);

const plan = {
  sourceValidationHash: "v",
  sourceInterpretationHash: "i",
  documentModelVersionHash: doc.metadata.contentHash,
  ruleSetVersion: "1.0.0",
  validationEngineVersion: "1.0.0",
  projectorVersion: "1.0.0",
  createdAt: "2026-01-01T00:00:00.000Z",
  createdBy: "u",
  operations: [],
  approvedCreates: {},
};

assert.doesNotThrow(() => assertApplyPlanFresh(plan, doc));
doc.pages[0]!.sections.push({
  sectionType: "ingresso",
  fields: [{ key: "ingresso.km", value: "1", confidence: 1, provenance: { source: "manual", pageIndex: 0, manuallyEdited: true } }],
});
doc.metadata.contentHash = hashDocumentModelContent(doc);
assert.throws(() => assertApplyPlanFresh(plan, doc), StaleApplyPlanError);
assert.equal(STALE_APPLY_PLAN_ERROR_CODE, "STALE_APPLY_PLAN");

const key = buildPipelineIdempotencyKey("ai_extract", "cap-1", "v2");
assert.equal(key, "ai_extract:cap-1:v2");

console.log("document-capture-v41-certification.test.ts OK");
