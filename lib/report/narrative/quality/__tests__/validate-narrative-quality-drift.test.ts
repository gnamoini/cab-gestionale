import assert from "node:assert/strict";
import { validateNarrativeQuality } from "@/lib/report/narrative/quality/validate-narrative-quality";
import type { GeneratedNarrativeContent } from "@/lib/report/narrative/providers/generated-narrative-content-schema";
import type { NarrativePromptContext } from "@/lib/report/narrative/types";
import { NARRATIVE_PROMPT_CONTEXT_VERSION } from "@/lib/report/narrative/types";

function ctx(
  severity: "info" | "warning" | "critical",
  trust: "GREEN" | "AMBER" | "RED",
): NarrativePromptContext {
  return {
    contractVersion: NARRATIVE_PROMPT_CONTEXT_VERSION,
    trustSummary: trust,
    sourceContextVersion: "1",
    signals: [
      {
        ruleKey: "TEST_SIGNAL",
        ruleVersion: 1,
        severity,
        trust,
        metricIds: ["lav-aperti"],
        payload: { schemaVersion: 1, values: { open: 3 } },
      },
    ],
  };
}

function content(explanation: string): GeneratedNarrativeContent {
  return {
    sections: [
      {
        ruleKey: "TEST_SIGNAL",
        metricIds: ["lav-aperti"],
        explanation,
      },
    ],
  };
}

assert.equal(
  validateNarrativeQuality(content("situazione critica"), ctx("warning", "GREEN")).ok,
  false,
  "critical language on warning signal fails",
);

assert.equal(
  validateNarrativeQuality(content("attenzione al backlog"), ctx("critical", "GREEN")).ok,
  true,
  "weaker language on critical signal passes",
);

assert.equal(
  validateNarrativeQuality(
    content("I dati confermano definitivamente il trend"),
    ctx("warning", "RED"),
  ).ok,
  false,
  "overconfident language on RED trust fails",
);

assert.equal(
  validateNarrativeQuality(
    content("I dati disponibili hanno limitazioni rilevanti"),
    ctx("warning", "RED"),
  ).ok,
  true,
  "limitation language on RED trust passes",
);

assert.equal(
  validateNarrativeQuality(
    content("Il margine operativo è in calo"),
    ctx("warning", "GREEN"),
  ).ok,
  false,
  "derived claim denylist fails",
);

console.log("validate-narrative-quality-drift.test.ts OK");
