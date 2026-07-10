/**
 * UI compliance score + snapshot diff.
 */

import fs from "node:fs";
import path from "node:path";
import {
  UI_CONTRACT_META,
  UI_CONTRACT_VERSION,
  UI_PRIMITIVE_VERSIONS,
} from "@/lib/ui-design-system-lock/component-contracts";
import {
  auditUiConsistencyRepo,
  countBySeverity,
  findingsByCategory,
  type UiAuditFinding,
  type UiConsistencyReport,
} from "@/lib/ui/ui-consistency-audit";

export const UI_COMPLIANCE_SNAPSHOT_FILE = ".ui-compliance-snapshot.json";

export type UiComplianceSnapshot = {
  contractVersion: string;
  primitiveVersions: typeof UI_PRIMITIVE_VERSIONS;
  generatedAt: string;
  scores: Record<string, number>;
  overall: number;
  blockers: number;
  warnings: number;
};

function categoryScore(findings: UiAuditFinding[], category: string, totalFiles: number): number {
  const catFindings = findings.filter((f) => f.category === category && f.severity !== "INFO");
  if (totalFiles === 0) return 100;
  const penalty = catFindings.length / totalFiles;
  return Math.max(0, Math.round((1 - penalty) * 100));
}

export function buildComplianceSnapshot(report: UiConsistencyReport): UiComplianceSnapshot {
  const total = report.passCount + new Set(report.findings.map((f) => f.file)).size;
  const scores = {
    Tooltip: categoryScore(report.findings, "Tooltip", total),
    Lists: categoryScore(report.findings, "Lists", total),
    Overlay: categoryScore(report.findings, "Overlay", total),
  };
  const overall = Math.round((scores.Tooltip + scores.Lists + scores.Overlay) / 3);
  const sev = countBySeverity(report.findings);
  return {
    contractVersion: report.contractVersion,
    primitiveVersions: report.primitiveVersions,
    generatedAt: new Date().toISOString().slice(0, 10),
    scores,
    overall,
    blockers: sev.blocker,
    warnings: sev.warn,
  };
}

export function loadSnapshot(root: string): UiComplianceSnapshot | null {
  const p = path.join(root, UI_COMPLIANCE_SNAPSHOT_FILE);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as UiComplianceSnapshot;
  } catch {
    return null;
  }
}

export function saveSnapshot(root: string, snapshot: UiComplianceSnapshot): void {
  fs.writeFileSync(path.join(root, UI_COMPLIANCE_SNAPSHOT_FILE), `${JSON.stringify(snapshot, null, 2)}\n`);
}

export function validateSnapshot(snapshot: UiComplianceSnapshot | null): string | null {
  if (!snapshot) return null;
  if (snapshot.contractVersion !== UI_CONTRACT_VERSION) {
    return `UI_CONTRACT_VERSION changed (${snapshot.contractVersion} → ${UI_CONTRACT_VERSION})`;
  }
  for (const [k, v] of Object.entries(UI_PRIMITIVE_VERSIONS)) {
    const prev = snapshot.primitiveVersions[k as keyof typeof UI_PRIMITIVE_VERSIONS];
    if (prev && prev !== v) {
      return `UI_PRIMITIVE_VERSIONS.${k} changed (${prev} → ${v})`;
    }
  }
  return null;
}

export function printInvalidation(reason: string, previous: UiComplianceSnapshot): void {
  console.log("UI Compliance Snapshot invalidated\n");
  console.log("Reason:");
  console.log(reason);
  console.log("");
  console.log(`Previous contract:  ${previous.contractVersion}`);
  console.log(`Current contract:   ${UI_CONTRACT_VERSION}`);
  console.log("");
  console.log("Action:");
  console.log("Regenerate baseline after review");
  console.log("  npm run audit:ui -- --report");
}

export function printComplianceReport(report: UiConsistencyReport): UiComplianceSnapshot {
  const snapshot = buildComplianceSnapshot(report);
  const sev = countBySeverity(report.findings);
  const byCat = findingsByCategory(report.findings);

  console.log("UI Compliance Score");
  console.log("───────────────────");
  console.log(`Contract:  ${UI_CONTRACT_VERSION}`);
  console.log(`Owner:     ${UI_CONTRACT_META.ownerTeam}`);
  console.log("");
  console.log(`Tooltip:   ${snapshot.scores.Tooltip}%  (${byCat.Tooltip?.length ?? 0} findings)`);
  console.log(`Lists:     ${snapshot.scores.Lists}%  (${byCat.Lists?.length ?? 0} findings)`);
  console.log(`Overlay:   ${snapshot.scores.Overlay}%  (${byCat.Overlay?.length ?? 0} findings)`);
  console.log(`Overall:   ${snapshot.overall}%`);
  console.log("");
  console.log(`Blockers: ${sev.blocker} | Warnings: ${sev.warn} | Info: ${sev.info}`);
  return snapshot;
}

export function printComplianceDiff(
  report: UiConsistencyReport,
  previous: UiComplianceSnapshot,
): UiComplianceSnapshot {
  const current = buildComplianceSnapshot(report);
  const sev = countBySeverity(report.findings);

  console.log("UI Compliance Delta");
  console.log("");
  console.log(`Contract:  ${UI_CONTRACT_VERSION}`);
  console.log(`Owner:     ${UI_CONTRACT_META.ownerTeam}`);
  console.log("");
  for (const key of ["Tooltip", "Lists", "Overlay"] as const) {
    const before = previous.scores[key];
    const after = current.scores[key];
    const delta = after - before;
    const sign = delta >= 0 ? "+" : "";
    console.log(`${key.padEnd(9)} ${before}% → ${after}%  (${sign}${delta}%)`);
  }
  console.log("");
  console.log(
    `New violations: ${sev.blocker} blockers | ${sev.warn} warnings (prev: ${previous.blockers} blockers | ${previous.warnings} warnings)`,
  );
  return current;
}
