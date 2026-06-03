/**
 * Global Flex System — absolute final state constants (immutable governance kernel).
 */

export const FLEX_SYSTEM_ABSOLUTE_FINAL_STATE = true as const;

/** Terminal layer — absolute final implies hard lock, governance, and freeze. */
export const FLEX_SYSTEM_HARD_LOCK_MODE = FLEX_SYSTEM_ABSOLUTE_FINAL_STATE;

/** @deprecated Use FLEX_SYSTEM_ABSOLUTE_FINAL_STATE */
export const FLEX_SYSTEM_GOVERNANCE_MODE = FLEX_SYSTEM_ABSOLUTE_FINAL_STATE;

/** @deprecated Use FLEX_SYSTEM_ABSOLUTE_FINAL_STATE */
export const FLEX_SYSTEM_FREEZE_MODE = FLEX_SYSTEM_ABSOLUTE_FINAL_STATE;

export const FLEX_BASELINE_PATH = ".eslint-flex-baseline.json";

export const FLEX_FREEZE_MANIFEST_PATH = "lib/ui/flex-freeze-manifest.json";

/** Must be "1" to run generate-flex-baseline.ts --update while absolute final state is active. */
export const FLEX_BASELINE_UPDATE_ENV = "FLEX_BASELINE_APPROVED";

/** Closed governance loop — no exceptions. */
export const FLEX_GOVERNANCE_UPDATE_STEPS = [
  "FLEX_BASELINE_APPROVED=1",
  "npm run flex:baseline:generate",
  "CI: flex:eslint:gate + flex:freeze:gate",
  "release-gate PASS",
] as const;

/** @deprecated Use FLEX_GOVERNANCE_UPDATE_STEPS */
export const FLEX_HARD_LOCK_UPDATE_PROTOCOL = FLEX_GOVERNANCE_UPDATE_STEPS;

/** @deprecated Use FLEX_GOVERNANCE_UPDATE_STEPS */
export const FLEX_CLOSED_GOVERNANCE_LOOP = FLEX_GOVERNANCE_UPDATE_STEPS;

export function isFlexBaselineUpdateApproved(): boolean {
  return process.env[FLEX_BASELINE_UPDATE_ENV] === "1";
}
