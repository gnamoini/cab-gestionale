import assert from "node:assert/strict";
import { runValidationEngine } from "@/lib/document-capture/rules/validation-engine";
import { hashValidationResultPayload } from "@/lib/document-capture/model/document-model-hash";
import type { DigitalDocument } from "@/lib/document-capture/model/document-model";

const baseDoc: DigitalDocument = {
  id: "c1",
  documentType: "scheda_officina_bundle",
  completeness: "partial",
  metadata: {
    schemaVersion: "1.0",
    migrationVersion: "1",
    documentModelVersion: "1.0.0",
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "test",
    contentHash: "abc",
  },
  pages: [
    {
      index: 0,
      physical: { isEmpty: false },
      sections: [
        {
          sectionType: "ingresso",
          fields: [{ key: "ingresso.km", value: "100", confidence: 1, provenance: { source: "ai", pageIndex: 0, manuallyEdited: false } }],
        },
      ],
    },
  ],
};

const r1 = runValidationEngine(baseDoc);
const r2 = runValidationEngine(structuredClone(baseDoc));
r2.metadata.generatedAt = r1.metadata.generatedAt;
assert.equal(hashValidationResultPayload(r1), hashValidationResultPayload(r2));
assert.equal(r1.metadata.validationEngineVersion, r2.metadata.validationEngineVersion);

console.log("validation-engine.test.ts OK");
