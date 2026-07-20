import assert from "node:assert/strict";
import { validateGeneratedNarrative } from "@/lib/report/narrative/validate-generated-narrative";
import type { GeneratedNarrativeContent } from "@/lib/report/narrative/providers/generated-narrative-content-schema";
import type { NarrativePromptContext } from "@/lib/report/narrative/types";
import { NARRATIVE_PROMPT_CONTEXT_VERSION } from "@/lib/report/narrative/types";

const input: NarrativePromptContext = {
  contractVersion: NARRATIVE_PROMPT_CONTEXT_VERSION,
  trustSummary: "GREEN",
  sourceContextVersion: "1",
  signals: [
    {
      ruleKey: "LAV_OPEN_BACKLOG",
      ruleVersion: 1,
      severity: "warning",
      trust: "GREEN",
      metricIds: ["lav-aperti", "lav-chiusi"],
      payload: { schemaVersion: 1, values: { open: 3 } },
    },
    {
      ruleKey: "MAG_LOW_STOCK",
      ruleVersion: 1,
      severity: "critical",
      trust: "AMBER",
      metricIds: ["mag-critical"],
      payload: { schemaVersion: 1, values: { count: 2 } },
    },
  ],
};

const valid: GeneratedNarrativeContent = {
  sections: [
    {
      ruleKey: "LAV_OPEN_BACKLOG",
      metricIds: ["lav-aperti"],
      explanation: "Backlog aperto rilevato.",
    },
    {
      ruleKey: "MAG_LOW_STOCK",
      metricIds: ["mag-critical"],
      explanation: "Scorte critiche.",
    },
  ],
};

assert.equal(validateGeneratedNarrative(valid, input).ok, true);

const unknownKey: GeneratedNarrativeContent = {
  sections: [{ ruleKey: "UNKNOWN", metricIds: ["lav-aperti"], explanation: "x" }],
};
assert.equal(validateGeneratedNarrative(unknownKey, input).ok, false);

const badMetric: GeneratedNarrativeContent = {
  sections: [{ ruleKey: "LAV_OPEN_BACKLOG", metricIds: ["eco_fatturato"], explanation: "x" }],
};
assert.equal(validateGeneratedNarrative(badMetric, input).ok, false);

const duplicate: GeneratedNarrativeContent = {
  sections: [
    { ruleKey: "LAV_OPEN_BACKLOG", metricIds: ["lav-aperti"], explanation: "a" },
    { ruleKey: "LAV_OPEN_BACKLOG", metricIds: ["lav-aperti"], explanation: "b" },
  ],
};
assert.equal(validateGeneratedNarrative(duplicate, input).ok, false);

console.log("validate-generated-narrative.test.ts OK");
