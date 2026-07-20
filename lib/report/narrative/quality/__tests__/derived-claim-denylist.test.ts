import assert from "node:assert/strict";
import { findDerivedClaimTerm } from "@/lib/report/narrative/quality/derived-claim-denylist";
import { validateNarrativeQuality } from "@/lib/report/narrative/quality/validate-narrative-quality";
import type { NarrativePromptContext } from "@/lib/report/narrative/types";
import { NARRATIVE_PROMPT_CONTEXT_VERSION } from "@/lib/report/narrative/types";

assert.equal(findDerivedClaimTerm("Il margine operativo cala"), "margine operativo");
assert.equal(findDerivedClaimTerm("L'efficienza operativa è bassa"), "efficienza");
assert.equal(
  findDerivedClaimTerm("L'efficienza operativa è 0,11 lav/ora", "CROSS_EFFICIENCY"),
  null,
);

const crossInput: NarrativePromptContext = {
  contractVersion: NARRATIVE_PROMPT_CONTEXT_VERSION,
  trustSummary: "GREEN",
  sourceContextVersion: "1",
  signals: [
    {
      ruleKey: "CROSS_EFFICIENCY",
      ruleVersion: 1,
      severity: "info",
      trust: "GREEN",
      metricIds: ["cross_efficiency"],
      payload: { schemaVersion: 1, values: { efficiency: 0.11 } },
    },
  ],
};

const crossPass = validateNarrativeQuality(
  {
    sections: [
      {
        ruleKey: "CROSS_EFFICIENCY",
        metricIds: ["cross_efficiency"],
        explanation: "L'efficienza operativa nel periodo è 0,11 lav/ora.",
      },
    ],
  },
  crossInput,
);
assert.equal(crossPass.ok, true, "efficienza allowed for CROSS_EFFICIENCY");

console.log("derived-claim-denylist.test.ts OK");
