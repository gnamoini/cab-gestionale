#!/usr/bin/env npx tsx
/**
 * Tooltip UX audit — inventario + baseline.
 * npm run audit:tooltip
 * npm run audit:tooltip -- --baseline
 */

import fs from "node:fs";
import path from "node:path";
import {
  auditTooltipRepo,
  formatAuditMarkdown,
  formatBaselineMarkdown,
  formatManualReviewScoresMarkdown,
  formatPrimitiveGeneratorsMarkdown,
  summarizeTooltipAudit,
} from "../lib/ui/tooltip-audit-scan";

const ROOT = process.cwd();
const WRITE_BASELINE = process.argv.includes("--baseline");
const AUDIT_PATH = path.join(ROOT, "docs/audit/TOOLTIP_AUDIT.md");
const BASELINE_PATH = path.join(ROOT, "docs/audit/TOOLTIP_AUDIT_BASELINE.md");
const PRIMITIVE_PATH = path.join(ROOT, "docs/audit/TOOLTIP_PRIMITIVE_GENERATORS.md");
const SCORES_PATH = path.join(ROOT, "docs/audit/TOOLTIP_MANUAL_REVIEW_SCORES.md");

const entries = auditTooltipRepo(ROOT);
const summary = summarizeTooltipAudit(entries);

fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
fs.writeFileSync(AUDIT_PATH, formatAuditMarkdown(entries, summary), "utf8");
fs.writeFileSync(PRIMITIVE_PATH, formatPrimitiveGeneratorsMarkdown(ROOT), "utf8");
fs.writeFileSync(SCORES_PATH, formatManualReviewScoresMarkdown(entries), "utf8");

if (WRITE_BASELINE || !fs.existsSync(BASELINE_PATH)) {
  fs.writeFileSync(BASELINE_PATH, formatBaselineMarkdown(summary), "utf8");
  console.log(`Wrote baseline: ${path.relative(ROOT, BASELINE_PATH)}`);
}

console.log(`Wrote audit: ${path.relative(ROOT, AUDIT_PATH)}`);
console.log(`Wrote primitive generators: ${path.relative(ROOT, PRIMITIVE_PATH)}`);
console.log(`Wrote manual review scores: ${path.relative(ROOT, SCORES_PATH)}`);
console.log(`Total: ${summary.TOTAL} | REMOVE_DUPLICATE: ${summary.REMOVE_DUPLICATE} | MANUAL_REVIEW: ${summary.MANUAL_REVIEW}`);
