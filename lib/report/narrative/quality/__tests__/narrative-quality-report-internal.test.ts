import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildGeneratedNarrativeDto } from "@/lib/report/narrative/builders/build-generated-narrative-dto";
import { generatedNarrativeDtoSchema } from "@/lib/report/narrative/narrative-schema";
import { generatedNarrativeContentSchema } from "@/lib/report/narrative/providers/generated-narrative-content-schema";

const indexSrc = fs.readFileSync(
  path.join(process.cwd(), "lib/report/narrative/index.ts"),
  "utf8",
);

assert.doesNotMatch(indexSrc, /NarrativeQualityReport/, "NarrativeQualityReport not exported from barrel");
assert.doesNotMatch(indexSrc, /emitNarrativeQualityTelemetry/, "telemetry not exported from barrel");

const content = generatedNarrativeContentSchema.parse({
  sections: [
    {
      ruleKey: "LAV_OPEN_BACKLOG",
      metricIds: ["lav-aperti"],
      explanation: "Spiegazione operativa.",
    },
  ],
});

const dto = buildGeneratedNarrativeDto(content, { model: "gemini-2.0-flash", latencyMs: 50 });
generatedNarrativeDtoSchema.parse(dto);

const dtoJson = JSON.stringify(dto);
assert.doesNotMatch(dtoJson, /checkedClaims/);
assert.doesNotMatch(dtoJson, /rejectedClaims/);
assert.doesNotMatch(dtoJson, /failureCode/);
assert.equal("qualityReport" in dto, false);

console.log("narrative-quality-report-internal.test.ts OK");
