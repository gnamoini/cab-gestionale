import assert from "node:assert/strict";
import { buildGeneratedNarrativeDto } from "@/lib/report/narrative/builders/build-generated-narrative-dto";
import { generatedNarrativeContentSchema } from "@/lib/report/narrative/providers/generated-narrative-content-schema";
import { generatedNarrativeDtoSchema } from "@/lib/report/narrative/narrative-schema";

const content = generatedNarrativeContentSchema.parse({
  sections: [
    {
      ruleKey: "LAV_OPEN_BACKLOG",
      metricIds: ["lav-aperti"],
      explanation: "Spiegazione operativa del segnale.",
    },
  ],
  disclaimer: "Output esplicativo, non fonte decisionale.",
});

const dto = buildGeneratedNarrativeDto(content, { model: "gemini-2.0-flash", latencyMs: 120 });
generatedNarrativeDtoSchema.parse(dto);

assert.ok(dto.generatedAt.length > 0);
assert.equal(dto.modelMetadata?.provider, "gemini");
assert.equal(dto.modelMetadata?.model, "gemini-2.0-flash");

const forbidden = ["severity", "trust", "priority", "metricValue", "kpiValue"] as const;
for (const key of forbidden) {
  assert.equal(key in dto, false, `forbidden top-level key: ${key}`);
  for (const section of dto.sections) {
    assert.equal(key in section, false, `forbidden section key: ${key}`);
  }
}

assert.doesNotMatch(JSON.stringify(content), /"generatedAt"/);
assert.doesNotMatch(JSON.stringify(content), /"modelMetadata"/);

console.log("narrative-provider-output-contract.test.ts OK");
