#!/usr/bin/env npx tsx
/**
 * UI Design Audit — gate, report, diff.
 * npm run audit:ui [-- --report] [-- --diff] [-- --write-snapshot]
 */

import fs from "node:fs";
import path from "node:path";
import { exitWithGate } from "../lib/ci/gate-output";
import { UI_CONTRACT_META, UI_CONTRACT_VERSION } from "../lib/ui-design-system-lock/component-contracts";
import {
  auditUiConsistencyRepo,
  countBySeverity,
  type UiAuditFinding,
} from "../lib/ui/ui-consistency-audit";
import {
  loadSnapshot,
  printComplianceDiff,
  printComplianceReport,
  printInvalidation,
  saveSnapshot,
  validateSnapshot,
} from "../lib/ui/ui-compliance-score";

const BASELINE_PATH = ".ui-audit-baseline.json";

type BaselineEntry = { file: string; line: number; severity: string; problem: string };

function loadBaseline(root: string): BaselineEntry[] {
  const p = path.join(root, BASELINE_PATH);
  if (!fs.existsSync(p)) return [];
  try {
    return (JSON.parse(fs.readFileSync(p, "utf8")) as { entries?: BaselineEntry[] }).entries ?? [];
  } catch {
    return [];
  }
}

function isInBaseline(entry: BaselineEntry, finding: UiAuditFinding): boolean {
  return (
    entry.file === finding.file &&
    entry.line === finding.line &&
    entry.problem === finding.problem
  );
}

function filterWithBaseline(findings: UiAuditFinding[], baseline: BaselineEntry[]): UiAuditFinding[] {
  if (baseline.length === 0) return findings;
  return findings.filter((f) => {
    if (f.severity !== "BLOCKER") return true;
    return !baseline.some((b) => isInBaseline(b, f));
  });
}

function printAuditReport(report: ReturnType<typeof auditUiConsistencyRepo>, findings: UiAuditFinding[]) {
  console.log("UI Design Audit Report");
  console.log("────────────────────────────────────────");
  console.log(`Contract version:  ${UI_CONTRACT_VERSION}`);
  console.log(`Owner team:        ${UI_CONTRACT_META.ownerTeam}`);
  console.log(`Baseline date:     ${new Date().toISOString().slice(0, 10)}`);
  console.log("");

  const blockers = findings.filter((f) => f.severity === "BLOCKER");
  const warnings = findings.filter((f) => f.severity === "WARN");

  for (const f of [...blockers, ...warnings].slice(0, 50)) {
    console.log(`Category:  ${f.category}`);
    console.log(`Owner:     ${f.ownerTeam}`);
    console.log(`Severity:  ${f.severity}`);
    console.log(`File:      ${f.file}:${f.line}`);
    console.log(`Problem:   ${f.problem}`);
    console.log(`Fix:       ${f.fix}`);
    console.log("");
  }

  if (report.exceptions.length > 0) {
    console.log("UI Contract Exceptions");
    console.log(`INFO: ${report.exceptions.length} approved exceptions`);
    for (const ex of report.exceptions) {
      console.log(`  - ${ex.file}:${ex.line}  reason: ${ex.reason}`);
    }
    console.log("");
  }

  const sev = countBySeverity(findings);
  console.log(`PASS:  ${report.passCount} conformi`);
  console.log(`FAIL:  ${sev.blocker} blockers | ${sev.warn} warnings | ${sev.info} info`);
}

function main() {
  const args = process.argv.slice(2);
  const reportMode = args.includes("--report");
  const diffMode = args.includes("--diff");
  const writeSnapshot = args.includes("--write-snapshot");

  const root = process.cwd();
  const report = auditUiConsistencyRepo(root);
  const baseline = loadBaseline(root);
  const findings = filterWithBaseline(report.findings, baseline);

  const previous = loadSnapshot(root);
  const invalidReason = validateSnapshot(previous);

  if (diffMode && invalidReason && previous) {
    printInvalidation(invalidReason, previous);
    console.log("");
  }

  if (reportMode) {
    const snap = printComplianceReport({ ...report, findings });
    if (writeSnapshot || !previous || invalidReason) {
      saveSnapshot(root, snap);
    }
    return;
  }

  if (diffMode) {
    if (!previous) {
      console.log("No snapshot — run: npm run audit:ui -- --report --write-snapshot");
      process.exit(1);
    }
    const snap = printComplianceDiff({ ...report, findings }, previous);
    if (writeSnapshot) saveSnapshot(root, snap);
    return;
  }

  printAuditReport(report, findings);
  const blockers = findings.filter((f) => f.severity === "BLOCKER");
  exitWithGate(blockers.length === 0 ? "PASS" : "FAIL");
}

main();
