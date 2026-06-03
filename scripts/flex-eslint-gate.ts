/**
 * Flex-only gate — static scan vs baseline (SSOT, no full lint).
 * Equivalent to ESLint cab-layout/no-flex-overflow-risk + grandfather baseline.
 */
import fs from "node:fs";
import path from "node:path";
import {
  diffFlexBaseline,
  verifyFlexBaselineIntegrity,
  type FlexBaselineFile,
} from "@/lib/lint/flex-baseline-fingerprint";
import { scanFlexViolations } from "@/lib/lint/scan-flex-violations";
import { FLEX_BASELINE_PATH } from "@/lib/ui/flex-system-freeze";

export type FlexEslintGateResult = {
  ok: boolean;
  blockers: string[];
  warnings: string[];
};

export function runFlexEslintGate(root = process.cwd()): FlexEslintGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const baselinePath = path.join(root, FLEX_BASELINE_PATH);

  if (!fs.existsSync(baselinePath)) {
    blockers.push(`Missing ${FLEX_BASELINE_PATH}`);
    return { ok: false, blockers, warnings };
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as FlexBaselineFile;
  const integrity = verifyFlexBaselineIntegrity(baseline);
  if (!integrity.valid) {
    for (const e of integrity.errors) blockers.push(`baseline integrity: ${e}`);
    return { ok: false, blockers, warnings };
  }

  const current = scanFlexViolations(root);
  const { added, removed } = diffFlexBaseline(current, baseline);

  if (added.length > 0) {
    blockers.push(`${added.length} flex violation(s) not in baseline`);
    for (const v of added.slice(0, 10)) {
      blockers.push(`  + ${v.file}:${v.line} [${v.reason}]`);
    }
    if (added.length > 10) {
      blockers.push(`  ... and ${added.length - 10} more`);
    }
  }

  if (removed.length > 0) {
    warnings.push(`${removed.length} stale baseline entry(ies) — run flex:baseline:generate to prune`);
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

function main(): void {
  const result = runFlexEslintGate();
  if (!result.ok) {
    console.error("flex-eslint-gate FAIL");
    for (const b of result.blockers) console.error(`  ${b}`);
    process.exit(1);
  }
  console.log("flex-eslint-gate OK — 0 new flex violations");
}

main();
