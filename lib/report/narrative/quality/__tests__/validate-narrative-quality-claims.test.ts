import assert from "node:assert/strict";
import { validateNarrativeQuality } from "@/lib/report/narrative/quality/validate-narrative-quality";
import type { GeneratedNarrativeContent } from "@/lib/report/narrative/providers/generated-narrative-content-schema";
import type { NarrativePromptContext } from "@/lib/report/narrative/types";
import { NARRATIVE_PROMPT_CONTEXT_VERSION } from "@/lib/report/narrative/types";

const input: NarrativePromptContext = {
  contractVersion: NARRATIVE_PROMPT_CONTEXT_VERSION,
  trustSummary: "GREEN",
  sourceContextVersion: "1",
  signals: [
    {
      ruleKey: "MAG_STOCK_DAYS",
      ruleVersion: 1,
      severity: "warning",
      trust: "GREEN",
      metricIds: ["mag-stock-days"],
      payload: { schemaVersion: 1, values: { stock_days: 27 } },
    },
  ],
};

const passContent: GeneratedNarrativeContent = {
  sections: [
    {
      ruleKey: "MAG_STOCK_DAYS",
      metricIds: ["mag-stock-days"],
      explanation: "Lo stock copre 27 giorni.",
    },
  ],
};

const failContent: GeneratedNarrativeContent = {
  sections: [
    {
      ruleKey: "MAG_STOCK_DAYS",
      metricIds: ["mag-stock-days"],
      explanation: "Lo stock copre 45 giorni.",
    },
  ],
};

const pass = validateNarrativeQuality(passContent, input);
assert.equal(pass.ok, true);
assert.equal(pass.report.checkedClaims, 1);
assert.equal(pass.report.rejectedClaims, 0);

const fail = validateNarrativeQuality(failContent, input);
assert.equal(fail.ok, false);
if (!fail.ok) {
  assert.equal(fail.code, "untraceable_numeric_claim");
  assert.equal(fail.report.failureCode, "untraceable_numeric_claim");
}

const receivablesInput: NarrativePromptContext = {
  contractVersion: NARRATIVE_PROMPT_CONTEXT_VERSION,
  trustSummary: "GREEN",
  sourceContextVersion: "1",
  signals: [
    {
      ruleKey: "ECO_RECEIVABLES",
      ruleVersion: 1,
      severity: "warning",
      trust: "GREEN",
      metricIds: ["eco_da_incassare"],
      payload: { schemaVersion: 1, values: { amount: 10.98 } },
    },
  ],
};

const receivablesPass = validateNarrativeQuality(
  {
    sections: [
      {
        ruleKey: "ECO_RECEIVABLES",
        metricIds: ["eco_da_incassare"],
        explanation: "I crediti da incassare ammontano a 10.98 euro.",
      },
    ],
  },
  receivablesInput,
);
assert.equal(receivablesPass.ok, true, "dot-decimal claim must match payload amount");

console.log("validate-narrative-quality-claims.test.ts OK");
