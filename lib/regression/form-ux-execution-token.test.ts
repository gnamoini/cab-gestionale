/**
 * Execution token — monotonic seq, invalidation → stale NO-OP.
 */
import assert from "node:assert/strict";
import {
  createFormUxExecutionToken,
  invalidateExecutionToken,
  isExecutionTokenValid,
  isFormSubmitTokenValid,
  beginSubmitTransaction,
  resetFormUxExecutionTokens,
} from "@/lib/form-ux-migration/form-ux-execution-token";

resetFormUxExecutionTokens();

const first = createFormUxExecutionToken("ricambio", "prezzo-listino");
assert.ok(isExecutionTokenValid("ricambio", "prezzo-listino", first));

const second = createFormUxExecutionToken("ricambio", "prezzo-listino");
assert.ok(!isExecutionTokenValid("ricambio", "prezzo-listino", first));
assert.ok(isExecutionTokenValid("ricambio", "prezzo-listino", second));

invalidateExecutionToken("ricambio", "prezzo-listino");
assert.ok(!isExecutionTokenValid("ricambio", "prezzo-listino", second));

const submitA = beginSubmitTransaction("ricambio");
const submitB = beginSubmitTransaction("ricambio");
assert.ok(!isFormSubmitTokenValid("ricambio", submitA));
assert.ok(isFormSubmitTokenValid("ricambio", submitB));

resetFormUxExecutionTokens();
console.log("form-ux-execution-token.test.ts OK");
