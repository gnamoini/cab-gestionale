/**
 * Diff flex violations vs .eslint-flex-baseline.json — nuove violazioni only.
 * Usage: npx tsx scripts/diff-flex-baseline.ts
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

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, FLEX_BASELINE_PATH);

function main(): void {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`Missing ${FLEX_BASELINE_PATH} — run: npm run flex:baseline:generate`);
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as FlexBaselineFile;
  const integrity = verifyFlexBaselineIntegrity(baseline);
  if (!integrity.valid) {
    console.error("Baseline integrity failed:");
    for (const e of integrity.errors) console.error(`  ${e}`);
    process.exit(1);
  }

  const current = scanFlexViolations(ROOT);
  const { added, removed } = diffFlexBaseline(current, baseline);

  if (added.length === 0 && removed.length === 0) {
    console.log(`flex:baseline:diff OK — ${current.length} violation(s), 0 new, 0 removed`);
    return;
  }

  if (added.length > 0) {
    console.error(`\n${added.length} NEW violation(s) not in baseline:\n`);
    for (const v of added) {
      console.error(`  + ${v.file}:${v.line} [${v.reason}]`);
    }
  }

  if (removed.length > 0) {
    console.log(`\n${removed.length} REMOVED from scan (still in baseline — run --update to prune):\n`);
    for (const v of removed.slice(0, 20)) {
      console.log(`  - ${v.file}:${v.line} [${v.reason}]`);
    }
    if (removed.length > 20) console.log(`  ... and ${removed.length - 20} more`);
  }

  if (added.length > 0) process.exit(1);
}

main();
