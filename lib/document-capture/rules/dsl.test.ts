import assert from "node:assert/strict";
import { buildRuleContext, evaluateRule, rule, severity, whenSection } from "@/lib/document-capture/rules/dsl";
import type { DigitalDocument } from "@/lib/document-capture/model/document-model";

function docWithKm(km: string | null): DigitalDocument {
  return {
    id: "c1",
    documentType: "scheda_officina_bundle",
    completeness: "partial",
    metadata: {
      schemaVersion: "1.0",
      migrationVersion: "1",
      documentModelVersion: "1.0.0",
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: "test",
      contentHash: "x",
    },
    pages: [
      {
        index: 0,
        physical: { isEmpty: false },
        sections: [
          {
            sectionType: "ingresso",
            fields: km
              ? [{ key: "ingresso.km", value: km, confidence: 0.9, provenance: { source: "ai", pageIndex: 0, manuallyEdited: false } }]
              : [],
          },
        ],
      },
    ],
  };
}

const kmRule = rule("km_required", "scheda_officina_bundle", [whenSection("ingresso")], {
  requireFieldKey: "ingresso.km",
  severity: severity.warning,
  message: "Km assente",
});

const ctxMissing = buildRuleContext(docWithKm(null));
const issue = evaluateRule(ctxMissing, kmRule);
assert.ok(issue);
assert.equal(issue?.severity, "warning");

const ctxOk = buildRuleContext(docWithKm("12000"));
assert.equal(evaluateRule(ctxOk, kmRule), null);

console.log("dsl.test.ts OK");
