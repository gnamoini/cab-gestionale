/**
 * UI consistency audit — AST + regex tiers.
 */

import fs from "node:fs";
import path from "node:path";
import {
  LIST_CONTRACT,
  MENU_CONTRACT,
  TOOLTIP_CONTRACT,
  UI_CONTRACT_META,
  UI_CONTRACT_VERSION,
  UI_PRIMITIVE_VERSIONS,
} from "@/lib/ui-design-system-lock/component-contracts";
import { scanDirectDsTooltipImports } from "@/lib/lint/rules/no-direct-ds-import";
import { scanNativeTitleInSource } from "@/lib/lint/rules/native-title-tooltip";
import { LIST_DIVIDER_UL_FORBIDDEN_INLINE } from "@/lib/ui/list-primitives";

export type UiAuditSeverity = "INFO" | "WARN" | "BLOCKER";

export type UiAuditFinding = {
  file: string;
  line: number;
  category: string;
  ownerTeam: string;
  severity: UiAuditSeverity;
  problem: string;
  fix: string;
};

export type UiContractException = {
  file: string;
  line: number;
  reason: string;
};

export type UiConsistencyReport = {
  contractVersion: string;
  primitiveVersions: typeof UI_PRIMITIVE_VERSIONS;
  ownerTeam: string;
  findings: UiAuditFinding[];
  exceptions: UiContractException[];
  passCount: number;
};

const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build"]);
const SCAN_ROOTS = ["components", "app"];
const EXT = new Set([".ts", ".tsx"]);

const FILE_ALLOWLIST = [
  "report-charts.tsx",
  "design-system/tooltip",
  "tooltip-rich-anchor",
  "tooltip-list",
  "tooltip-status",
  "use-tooltip",
];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function rel(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

function isFileAllowlisted(fileRel: string): boolean {
  return FILE_ALLOWLIST.some((s) => fileRel.includes(s));
}

function scanRegexFindings(fileRel: string, content: string): UiAuditFinding[] {
  const findings: UiAuditFinding[] = [];
  const lines = content.split(/\r?\n/);

  if (
    TOOLTIP_CONTRACT.forbiddenPatterns.fail.some((p) => {
      const re = new RegExp(p);
      return re.test(content) && !isFileAllowlisted(fileRel);
    })
  ) {
    const idx = lines.findIndex((l) => l.includes("createPortal") && l.includes("dsTooltipContent"));
    findings.push({
      file: fileRel,
      line: idx >= 0 ? idx + 1 : 1,
      category: "Tooltip",
      ownerTeam: UI_CONTRACT_META.ownerTeam,
      severity: "BLOCKER",
      problem: "Inline portal tooltip duplicate",
      fix: "Use Tooltip, TooltipList, or TooltipStatus from @/components/ui",
    });
  }

  for (const p of TOOLTIP_CONTRACT.forbiddenPatterns.warnThenFail) {
    const re = new RegExp(p);
    lines.forEach((line, i) => {
      if (!re.test(line)) return;
      if (line.includes("ui-contract-disable")) return;
      findings.push({
        file: fileRel,
        line: i + 1,
        category: "Tooltip",
        ownerTeam: UI_CONTRACT_META.ownerTeam,
        severity: "WARN",
        problem: `Suspect CSS tooltip pattern (${p})`,
        fix: "Use @/components/ui Tooltip",
      });
    });
  }

  if (content.includes(LIST_DIVIDER_UL_FORBIDDEN_INLINE) && !fileRel.includes("settings-list-ui")) {
    const idx = lines.findIndex((l) => l.includes(LIST_DIVIDER_UL_FORBIDDEN_INLINE));
    if (idx >= 0) {
      findings.push({
        file: fileRel,
        line: idx + 1,
        category: "Lists",
        ownerTeam: UI_CONTRACT_META.ownerTeam,
        severity: "WARN",
        problem: "Inline divide-y list shell",
        fix: "import { LIST_DIVIDER_UL } from @/lib/ui/list-primitives",
      });
    }
  }

  if (/<ul[^>]+role=["']menu["']/i.test(content) && !fileRel.includes("global-anchored-menu")) {
    findings.push({
      file: fileRel,
      line: 1,
      category: "Overlay",
      ownerTeam: UI_CONTRACT_META.ownerTeam,
      severity: "WARN",
      problem: "Custom portal menu",
      fix: "Use GlobalAnchoredMenu from @/components/ui",
    });
  }

  for (const token of ["prevTableTd", "dsTableHead", "dsTableHeadCell"]) {
    if (fileRel.endsWith("-view.tsx") && content.includes(token)) {
      findings.push({
        file: fileRel,
        line: 1,
        category: "Lists",
        ownerTeam: UI_CONTRACT_META.ownerTeam,
        severity: "BLOCKER",
        problem: `Deprecated table token ${token}`,
        fix: "Use GestionaleListTable + GlobalTableSortTh",
      });
    }
  }

  if (content.includes("@radix-ui/react-tooltip")) {
    findings.push({
      file: fileRel,
      line: 1,
      category: "Tooltip",
      ownerTeam: UI_CONTRACT_META.ownerTeam,
      severity: "BLOCKER",
      problem: "Forbidden Radix tooltip import",
      fix: TOOLTIP_CONTRACT.consumerImportPath,
    });
  }

  return findings;
}

export function auditUiConsistencyRepo(root = process.cwd()): UiConsistencyReport {
  const findings: UiAuditFinding[] = [];
  const exceptions: UiContractException[] = [];
  let passCount = 0;

  const files = SCAN_ROOTS.flatMap((d) => walk(path.join(root, d)));

  for (const file of files) {
    const fileRel = rel(root, file);
    if (isFileAllowlisted(fileRel)) {
      passCount++;
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    let fileHasIssue = false;

    const native = scanNativeTitleInSource(fileRel, content);
    exceptions.push(...native.exceptions);
    for (const v of native.violations) {
      fileHasIssue = true;
      findings.push({
        file: v.file,
        line: v.line,
        category: TOOLTIP_CONTRACT.category,
        ownerTeam: UI_CONTRACT_META.ownerTeam,
        severity: "BLOCKER",
        problem: v.message,
        fix: v.fix,
      });
    }

    for (const v of scanDirectDsTooltipImports(fileRel, content)) {
      fileHasIssue = true;
      findings.push({
        file: v.file,
        line: v.line,
        category: TOOLTIP_CONTRACT.category,
        ownerTeam: UI_CONTRACT_META.ownerTeam,
        severity: "WARN",
        problem: v.message,
        fix: v.fix,
      });
    }

    for (const f of scanRegexFindings(fileRel, content)) {
      fileHasIssue = true;
      findings.push(f);
    }

    if (!fileHasIssue) passCount++;
  }

  return {
    contractVersion: UI_CONTRACT_VERSION,
    primitiveVersions: UI_PRIMITIVE_VERSIONS,
    ownerTeam: UI_CONTRACT_META.ownerTeam,
    findings,
    exceptions,
    passCount,
  };
}

export function findingsByCategory(findings: UiAuditFinding[]): Record<string, UiAuditFinding[]> {
  const out: Record<string, UiAuditFinding[]> = {
    Tooltip: [],
    Lists: [],
    Overlay: [],
  };
  for (const f of findings) {
    (out[f.category] ??= []).push(f);
  }
  return out;
}

export function countBySeverity(findings: UiAuditFinding[]) {
  return {
    blocker: findings.filter((f) => f.severity === "BLOCKER").length,
    warn: findings.filter((f) => f.severity === "WARN").length,
    info: findings.filter((f) => f.severity === "INFO").length,
  };
}

// ponytail: reference contracts in audit module for tree-shake docs
void LIST_CONTRACT;
void MENU_CONTRACT;
