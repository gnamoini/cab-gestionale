/**
 * Static audit — GlobalTableHead DOM safety (no nested tr/th, SSOT convergence).
 */
import fs from "node:fs";
import path from "node:path";

export type GlobalTableHeadAuditSeverity = "blocker" | "warning";

export type GlobalTableHeadAuditIssue = {
  file: string;
  line: number;
  rule: string;
  severity: GlobalTableHeadAuditSeverity;
  message: string;
};

export type GlobalTableHeadAuditReport = {
  filesScanned: number;
  blockers: GlobalTableHeadAuditIssue[];
  warnings: GlobalTableHeadAuditIssue[];
};

const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build"]);
const SCAN_ROOTS = ["components", "app", "lib", "src"] as const;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function rel(root: string, file: string): string {
  return file.replace(root + path.sep, "").replace(/\\/g, "/");
}

function lineHasManualThead(line: string): boolean {
  return /<thead[\s>]/.test(line) && !/<GlobalTableHead[\s>]/.test(line);
}

export function scanGlobalTableHeadFileContent(fileRel: string, content: string): GlobalTableHeadAuditIssue[] {
  const issues: GlobalTableHeadAuditIssue[] = [];
  const lines = content.split(/\r?\n/);

  const importsHeadLabel = /\bGlobalTableHeadLabel\b/.test(content);
  const importsGlobalTableHead = /\bGlobalTableHead\b/.test(content);
  const usesManualThead = lines.some(lineHasManualThead);

  if (importsHeadLabel && usesManualThead && !importsGlobalTableHead) {
    const line = lines.findIndex(lineHasManualThead) + 1;
    issues.push({
      file: fileRel,
      line: line || 1,
      rule: "manual-thead-without-global-table-head",
      severity: "warning",
      message: "Manual <thead> with GlobalTableHeadLabel but no GlobalTableHead — migrate to SSOT wrapper.",
    });
  }

  lines.forEach((line, idx) => {
    const n = idx + 1;

    if (/<thead[^>]*>[\s\S]*<thead[\s>]/.test(line)) {
      issues.push({
        file: fileRel,
        line: n,
        rule: "nested-thead",
        severity: "blocker",
        message: "Nested <thead> detected.",
      });
    }

    if (/<th[\s>][^<]*<GlobalTableHeadLabel\b/.test(line)) {
      issues.push({
        file: fileRel,
        line: n,
        rule: "th-wraps-head-label",
        severity: "blocker",
        message: "<th> wrapping GlobalTableHeadLabel — th-in-th risk.",
      });
    }
  });

  let inGlobalTableHead = false;
  let globalTableHeadStart = 0;
  let headNestDepth = 0;
  let sawDirectTr = false;
  let sawDirectOther = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (/<GlobalTableHead[\s>]/.test(line) && !/<\/GlobalTableHead>/.test(line)) {
      inGlobalTableHead = true;
      globalTableHeadStart = i + 1;
      headNestDepth = 0;
      sawDirectTr = false;
      sawDirectOther = false;
    }

    if (inGlobalTableHead) {
      const openTr = (line.match(/<tr[\s>]/g) || []).length;
      const closeTr = (line.match(/<\/tr>/g) || []).length;

      if (headNestDepth === 0 && openTr > 0) {
        sawDirectTr = true;
      }

      headNestDepth += openTr;
      headNestDepth -= closeTr;
      if (headNestDepth < 0) headNestDepth = 0;

      const sameLineTrWrapper = /<tr[\s>][\s\S]*<\/tr>/.test(line);

      if (
        headNestDepth === 0 &&
        (/<GlobalTableHeadLabel\b/.test(line) ||
          /<GlobalTableSortTh\b/.test(line) ||
          /<ReportSortTh\b/.test(line) ||
          /<GestionaleListTableActionsHead\b/.test(line) ||
          (!sameLineTrWrapper && /<th[\s>]/.test(line)))
      ) {
        sawDirectOther = true;
      }

      if (/<\/GlobalTableHead>/.test(line)) {
        if (sawDirectTr && sawDirectOther) {
          issues.push({
            file: fileRel,
            line: globalTableHeadStart,
            rule: "global-table-head-tr-mix",
            severity: "blocker",
            message: "GlobalTableHead contains both <tr> and head cells — nested tr risk.",
          });
        }
        inGlobalTableHead = false;
      }
    }
  }

  return issues;
}

export function auditGlobalTableHeadFiles(root: string, files: readonly string[]): GlobalTableHeadAuditReport {
  const blockers: GlobalTableHeadAuditIssue[] = [];
  const warnings: GlobalTableHeadAuditIssue[] = [];

  for (const file of files) {
    const fileRel = rel(root, file);
    const content = fs.readFileSync(file, "utf8");
    if (!/<table[\s>]/.test(content) && !/<thead[\s>]/.test(content) && !/\bGlobalTableHead\b/.test(content)) {
      continue;
    }
    for (const issue of scanGlobalTableHeadFileContent(fileRel, content)) {
      if (issue.severity === "blocker") blockers.push(issue);
      else warnings.push(issue);
    }
  }

  return { filesScanned: files.length, blockers, warnings };
}

export function auditGlobalTableHeadRepo(root: string = process.cwd()): GlobalTableHeadAuditReport {
  const files = SCAN_ROOTS.flatMap((d) => walk(path.join(root, d)));
  return auditGlobalTableHeadFiles(root, files);
}

export function formatGlobalTableHeadAuditReport(report: GlobalTableHeadAuditReport): string {
  const lines: string[] = [
    `Global Table Head Audit — ${report.filesScanned} file(s) scanned`,
    `blockers: ${report.blockers.length}`,
    `warnings: ${report.warnings.length}`,
  ];

  if (report.blockers.length > 0) {
    lines.push("", "blockers:");
    for (const b of report.blockers) {
      lines.push(`  - [${b.rule}] ${b.file}:${b.line} — ${b.message}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push("", "warnings:");
    for (const w of report.warnings) {
      lines.push(`  - [${w.rule}] ${w.file}:${w.line} — ${w.message}`);
    }
  }

  return lines.join("\n");
}
