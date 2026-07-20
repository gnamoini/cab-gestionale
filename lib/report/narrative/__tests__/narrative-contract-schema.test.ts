import assert from "node:assert/strict";
import {
  GENERATED_NARRATIVE_CONTRACT_VERSION,
  NARRATIVE_PROMPT_CONTEXT_VERSION,
  type GeneratedNarrativeDto,
  type NarrativePromptContext,
  type NarrativePromptSignal,
} from "@/lib/report/narrative/types";
import {
  generatedNarrativeDtoSchema,
  narrativePromptContextSchema,
} from "@/lib/report/narrative/narrative-schema";
import { AI_INSIGHT_PAYLOAD_SCHEMA_VERSION } from "@/lib/report/ai-context/types";

const sampleSignal: NarrativePromptSignal = {
  ruleKey: "LAV_OPEN_BACKLOG",
  ruleVersion: 1,
  severity: "warning",
  trust: "GREEN",
  metricIds: ["lav-aperti"],
  payload: {
    schemaVersion: AI_INSIGHT_PAYLOAD_SCHEMA_VERSION,
    values: { open: 3 },
  },
};

assert.equal("message" in sampleSignal, false);
assert.equal("interpretation" in sampleSignal, false);
assert.equal("drillDown" in sampleSignal, false);

const sampleContext: NarrativePromptContext = {
  contractVersion: NARRATIVE_PROMPT_CONTEXT_VERSION,
  trustSummary: "GREEN",
  signals: [sampleSignal],
  sourceContextVersion: "1",
};

assert.equal(sampleContext.contractVersion, "1");
assert.equal(NARRATIVE_PROMPT_CONTEXT_VERSION, "1");
assert.equal(GENERATED_NARRATIVE_CONTRACT_VERSION, "1");

narrativePromptContextSchema.parse(sampleContext);

const sampleNarrative: GeneratedNarrativeDto = {
  contractVersion: GENERATED_NARRATIVE_CONTRACT_VERSION,
  sections: [
    {
      ruleKey: "LAV_OPEN_BACKLOG",
      metricIds: ["lav-aperti"],
      explanation: "Backlog elevato nel periodo.",
      sourceTrust: "GREEN",
    },
  ],
  generatedAt: new Date().toISOString(),
  modelMetadata: { provider: "gemini", model: "gemini-2.0-flash" },
};

generatedNarrativeDtoSchema.parse(sampleNarrative);

console.log("narrative-contract-schema.test.ts OK");
