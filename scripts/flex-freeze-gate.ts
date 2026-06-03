/**
 * Global Flex System — absolute final state CI gate (no full lint).
 */
import fs from "node:fs";
import path from "node:path";
import { exitWithGate, printGateResult } from "../lib/ci/gate-output";
import {
  verifyFlexBaselineIntegrity,
  type FlexBaselineFile,
} from "../lib/lint/flex-baseline-fingerprint";
import {
  verifyFlexSystemAbsoluteFinalState,
  verifyFlexSystemGovernanceContract,
} from "../lib/ui/flex-system-policy";
import {
  FLEX_BASELINE_PATH,
  FLEX_FREEZE_MANIFEST_PATH,
  FLEX_SYSTEM_ABSOLUTE_FINAL_STATE,
  FLEX_SYSTEM_GOVERNANCE_MODE,
  FLEX_SYSTEM_HARD_LOCK_MODE,
} from "../lib/ui/flex-system-freeze";
import {
  verifyFlexFreezeManifest,
  type FlexFreezeManifest,
} from "../lib/ui/flex-freeze-manifest";
import { runFlexEslintGate } from "./flex-eslint-gate";

const GATE_NAME = "Flex system absolute final gate";
const ROOT = process.cwd();

function main(): void {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!FLEX_SYSTEM_ABSOLUTE_FINAL_STATE) {
    blockers.push("FLEX_SYSTEM_ABSOLUTE_FINAL_STATE must be true in absolute final state");
  }

  if (!FLEX_SYSTEM_HARD_LOCK_MODE) {
    blockers.push("FLEX_SYSTEM_HARD_LOCK_MODE must be true in post-governance hard lock");
  }

  if (!FLEX_SYSTEM_GOVERNANCE_MODE) {
    blockers.push("FLEX_SYSTEM_GOVERNANCE_MODE must be true in governance mode");
  }

  const contract = verifyFlexSystemGovernanceContract();
  if (!contract.valid) {
    for (const e of contract.errors) blockers.push(`governance contract: ${e}`);
  }

  const finalState = verifyFlexSystemAbsoluteFinalState();
  if (!finalState.valid) {
    for (const e of finalState.errors) blockers.push(`absolute final: ${e}`);
  }

  const baselinePath = path.join(ROOT, FLEX_BASELINE_PATH);
  if (!fs.existsSync(baselinePath)) {
    blockers.push(`Missing ${FLEX_BASELINE_PATH}`);
  } else {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as FlexBaselineFile;
    const integrity = verifyFlexBaselineIntegrity(baseline);
    if (!integrity.valid) {
      for (const e of integrity.errors) blockers.push(`baseline integrity: ${e}`);
    }

    const manifestPath = path.join(ROOT, FLEX_FREEZE_MANIFEST_PATH);
    if (!fs.existsSync(manifestPath)) {
      blockers.push(`Missing ${FLEX_FREEZE_MANIFEST_PATH}`);
    } else {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as FlexFreezeManifest;
      const manifestCheck = verifyFlexFreezeManifest(manifest, baseline);
      if (!manifestCheck.valid) {
        for (const e of manifestCheck.errors) blockers.push(`manifest: ${e}`);
      }
    }
  }

  const eslintGate = runFlexEslintGate();
  if (!eslintGate.ok) {
    blockers.push(...eslintGate.blockers);
  }
  warnings.push(...eslintGate.warnings);

  const status = blockers.length === 0 ? "PASS" : "FAIL";
  printGateResult({ name: GATE_NAME, status, blockers, warnings });
  exitWithGate(status);
}

main();
