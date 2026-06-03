/**
 * @deprecated Use `npm run flex:baseline:diff` — baseline-aware diff via SSOT analyzer.
 */
import { scanFlexViolations } from "@/lib/lint/scan-flex-violations";

const violations = scanFlexViolations();

if (violations.length) {
  console.error("Deprecated scan-flex-violations — use npm run flex:baseline:diff\n");
  for (const v of violations) {
    console.error(`${v.file}:${v.line} [${v.reason}]`);
  }
  process.exit(1);
}

console.log("OK — 0 flex violations (deprecated script; prefer flex:baseline:diff)");
