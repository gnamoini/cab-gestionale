/**
 * UI OS Render Decision — pipeline + drift gating tests.
 */
import assert from "node:assert/strict";
import {
  DRIFT_ALLOW_THRESHOLD,
  DRIFT_BLOCK_THRESHOLD,
  evaluateRenderDecision,
  layoutDriftLevel,
} from "@/lib/ui-os/ui-render-decision";
import { validateFlexSystemPolicy } from "@/lib/ui/flex-system-policy";
import { getSuggestedSchema } from "@/lib/ui-os/ui-schema";

assert.equal(DRIFT_ALLOW_THRESHOLD, 20);
assert.equal(DRIFT_BLOCK_THRESHOLD, 40);

const reportSchema = getSuggestedSchema("/report");
const flexOk = validateFlexSystemPolicy(reportSchema);
assert.equal(flexOk.safe, true, "report-dashboard flex safety");

const lavSchema = getSuggestedSchema("/lavorazioni");
const lavFlex = validateFlexSystemPolicy(lavSchema);
assert.equal(lavFlex.safe, true, "gestionale-core flex safety");

assert.equal(layoutDriftLevel(10), "LOW");
assert.equal(layoutDriftLevel(30), "MEDIUM");
assert.equal(layoutDriftLevel(50), "HIGH");

const prevEnv = process.env.NEXT_PUBLIC_CAB_UI_OS;
process.env.NEXT_PUBLIC_CAB_UI_OS = "1";

const blockedDecision = evaluateRenderDecision({
  pageId: "/report",
  schema: reportSchema,
  mode: "os",
  root: null,
});
// SSR/no-root → driftScore 100 → blocked
assert.equal(blockedDecision.primary, "legacy");
assert.equal(blockedDecision.fallbackReason, "drift_blocked");

process.env.NEXT_PUBLIC_CAB_UI_OS = "0";
const envDisabled = evaluateRenderDecision({
  pageId: "/report",
  schema: reportSchema,
  mode: "os",
});
assert.equal(envDisabled.fallbackReason, "env_disabled");

process.env.NEXT_PUBLIC_CAB_UI_OS = "1";

const invalid = evaluateRenderDecision({
  pageId: "/report",
  schema: { toolbar: "invalid" as "standard" },
  mode: "os",
});
assert.equal(invalid.fallbackReason, "invalid_schema");

const contractBad = evaluateRenderDecision({
  pageId: "/lavorazioni",
  schema: { toolbar: "standard", table: "legacy", layout: "gestionale-core" },
  mode: "os",
});
assert.equal(contractBad.fallbackReason, "contract_violation");

process.env.NEXT_PUBLIC_CAB_UI_OS = prevEnv;

console.log("ui-os-render-decision.test.ts OK");
