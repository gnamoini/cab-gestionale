/**
 * Visual Layout Linter — confronto signature e drift cross-instance.
 */

import type { LayoutLinterIssue } from "@/lib/ui-visual-linter/layout-rules";
import type { LayoutSignature, TableSignature, ToolbarSignature } from "@/lib/ui-visual-linter/layout-signature";
import { CANONICAL } from "@/lib/ui-visual-linter/layout-rules";

function groupByType(signatures: LayoutSignature[]): Map<string, LayoutSignature[]> {
  const map = new Map<string, LayoutSignature[]>();
  for (const sig of signatures) {
    const list = map.get(sig.type) ?? [];
    list.push(sig);
    map.set(sig.type, list);
  }
  return map;
}

function toolbarGapDrift(a: ToolbarSignature, b: ToolbarSignature): boolean {
  return Math.abs(a.gapPx - b.gapPx) > CANONICAL.tolerancePx + 2;
}

function tableDensityDrift(a: TableSignature, b: TableSignature): boolean {
  return a.density !== b.density;
}

function tableHeaderPaddingDrift(a: TableSignature, b: TableSignature): boolean {
  return (
    Math.abs(a.thPaddingY - b.thPaddingY) > CANONICAL.tolerancePx ||
    Math.abs(a.thPaddingX - b.thPaddingX) > CANONICAL.tolerancePx
  );
}

/** Confronta signature dello stesso tipo sulla pagina e rileva drift. */
export function detectCrossInstanceDrift(
  signatures: LayoutSignature[],
  pageId: string,
): LayoutLinterIssue[] {
  const issues: LayoutLinterIssue[] = [];
  const grouped = groupByType(signatures);

  const toolbars = grouped.get("toolbar") ?? [];
  if (toolbars.length >= 2) {
    const first = toolbars[0] as ToolbarSignature;
    for (let i = 1; i < toolbars.length; i++) {
      const other = toolbars[i] as ToolbarSignature;
      if (toolbarGapDrift(first, other)) {
        issues.push({
          rule: "cross-instance-drift",
          severity: "warning",
          message: `toolbar gap inconsistency across sections (${first.gapPx}px vs ${other.gapPx}px)`,
          target: other.target,
          expected: `${first.gapPx}px`,
          found: `${other.gapPx}px`,
          category: "toolbar",
        });
      }
    }
  }

  const tables = grouped.get("table") ?? [];
  if (tables.length >= 2) {
    const first = tables[0] as TableSignature;
    for (let i = 1; i < tables.length; i++) {
      const other = tables[i] as TableSignature;
      if (tableDensityDrift(first, other)) {
        issues.push({
          rule: "cross-instance-drift",
          severity: "warning",
          message: "table density mismatch across sections",
          target: other.target,
          expected: first.density,
          found: other.density,
          category: "table",
        });
      }
      if (tableHeaderPaddingDrift(first, other)) {
        issues.push({
          rule: "cross-instance-drift",
          severity: "info",
          message: "table header padding mismatch across sections",
          target: other.target,
          category: "spacing",
        });
      }
    }
  }

  const modals = grouped.get("modal") ?? [];
  if (modals.length >= 2) {
    const footers = modals.map((m) => (m.type === "modal" ? m.footerJustify : ""));
    const unique = new Set(footers);
    if (unique.size > 1) {
      issues.push({
        rule: "cross-instance-drift",
        severity: "info",
        message: "modal footer alignment drift across open modals",
        target: pageId,
        category: "modal",
      });
    }
  }

  return issues;
}

export function dedupeIssues(issues: LayoutLinterIssue[], pageId: string): LayoutLinterIssue[] {
  const seen = new Set<string>();
  const out: LayoutLinterIssue[] = [];

  for (const issue of issues) {
    const key = `${pageId}::${issue.rule}::${issue.target}::${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }

  return out;
}

export function issueFingerprint(issue: LayoutLinterIssue, pageId: string): string {
  return `${pageId}::${issue.rule}::${issue.target}`;
}
