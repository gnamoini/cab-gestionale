/**
 * Race condition — rapid input seq; only latest token commits.
 */
import assert from "node:assert/strict";
import { atomicRolloutTransaction } from "@/lib/form-ux-migration/atomic-rollout-transaction";
import {
  createFormUxExecutionToken,
  resetFormUxExecutionTokens,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import { clearAllFormUxFieldRegistries } from "@/lib/form-ux-migration/form-ux-field-registry";
import { resetRolloutStateLocks } from "@/lib/form-ux-migration/rollout-state-lock";
import { clearRolloutStateStore } from "@/lib/form-ux-migration/rollout-state-store";

clearRolloutStateStore();
clearAllFormUxFieldRegistries();
resetFormUxExecutionTokens();
resetRolloutStateLocks();

const tokens = Array.from({ length: 5 }, () =>
  createFormUxExecutionToken("ricambio", "prezzo-listino"),
);

const results = tokens.map((token, i) =>
  atomicRolloutTransaction({
    formId: "ricambio",
    fieldId: "prezzo-listino",
    kind: "number",
    token,
    legacyState: { prezzoFornitoreOriginale: String(i) },
    mode: "evaluation",
    onCompute: () => {},
  }),
);

const staleCount = results.filter((r) => r.stale).length;
const okCount = results.filter((r) => r.ok).length;

assert.equal(staleCount, 4);
assert.equal(okCount, 1);
assert.ok(results[4]!.ok);
assert.ok(results[0]!.stale);

resetFormUxExecutionTokens();
resetRolloutStateLocks();
clearRolloutStateStore();
clearAllFormUxFieldRegistries();
console.log("form-ux-race-condition.test.ts OK");
