/**
 * UI Autonomy Fix Engine — orchestratore DEV-only.
 * Input: Visual Layout Linter result → safe auto-fix → console report.
 */

import { applyFixes, type AppliedFix } from "@/lib/ui-autonomy-fix/fix-apply-engine";
import { isDevFixEnabled } from "@/lib/ui-autonomy-fix/fix-safety-guard";
import { partitionIssues } from "@/lib/ui-autonomy-fix/layout-fix-rules";
import { strategiesForIssues, toolbarFlexSafeRowFix } from "@/lib/ui-autonomy-fix/fix-strategies";
import type { UIFix } from "@/lib/ui-autonomy-fix/fix-strategies";
import type { LayoutLinterIssue } from "@/lib/ui-visual-linter/layout-rules";
import {
  runVisualLayoutLinter,
  runVisualLayoutLinterFromMain,
  type VisualLayoutLinterResult,
} from "@/lib/ui-visual-linter/visual-layout-linter";

export const UI_AUTONOMY_FIX_LOG_PREFIX = "[ui-autonomy-fix]";

export type UIAutonomyFixResult = {
  pageId: string;
  linterScore: number;
  applied: AppliedFix[];
  flagged: LayoutLinterIssue[];
  skippedCount: number;
};

function enrichToolbarFixes(issues: LayoutLinterIssue[]): UIFix[] {
  const fixes = strategiesForIssues(issues);

  for (const issue of issues) {
    if (issue.category !== "toolbar") continue;
    if (issue.rule === "toolbar-search-flex" || issue.rule === "toolbar-gap") {
      const rowFix = toolbarFlexSafeRowFix(issue.target);
      if (!fixes.some((f) => f.target === rowFix.target && f.rule === rowFix.rule)) {
        fixes.push(rowFix);
      }
    }
  }

  return fixes;
}

/** Esegue linter + auto-fix su root DOM. */
export function runUIAutonomyFixEngine(
  root: Element | null | undefined,
  pageId: string,
  linterResult?: VisualLayoutLinterResult,
): UIAutonomyFixResult {
  const empty: UIAutonomyFixResult = {
    pageId,
    linterScore: 100,
    applied: [],
    flagged: [],
    skippedCount: 0,
  };

  if (!isDevFixEnabled() || !root || typeof window === "undefined") {
    return empty;
  }

  const lint = linterResult ?? runVisualLayoutLinter(root, pageId);
  const { fixable, flagged } = partitionIssues(lint.issues);
  const fixes = enrichToolbarFixes(fixable);
  const { applied, skipped } = applyFixes(root, fixes, pageId);

  return {
    pageId,
    linterScore: lint.score.overall,
    applied,
    flagged,
    skippedCount: skipped.length,
  };
}

export function runUIAutonomyFixEngineFromMain(
  pageId: string,
  linterResult?: VisualLayoutLinterResult,
): UIAutonomyFixResult {
  if (typeof document === "undefined") {
    return runUIAutonomyFixEngine(null, pageId, linterResult);
  }
  const main = document.querySelector(".cab-app-shell main");
  const lint = linterResult ?? runVisualLayoutLinterFromMain(pageId);
  return runUIAutonomyFixEngine(main, pageId, lint);
}

/** Console output DEV — non blocking. */
export function emitUIAutonomyFixReport(result: UIAutonomyFixResult): void {
  if (!isDevFixEnabled()) return;

  const { pageId, applied, flagged, linterScore } = result;

  if (applied.length === 0 && flagged.length === 0) return;

  console.groupCollapsed(
    `${UI_AUTONOMY_FIX_LOG_PREFIX} ${pageId} — applied ${applied.length}, flagged ${flagged.length} (score ${linterScore}/100)`,
  );
  console.log(`${UI_AUTONOMY_FIX_LOG_PREFIX}`);
  console.log(`applied fixes: ${applied.length}`);

  for (const a of applied) {
    console.log(`- ${a.fix.description} (+${a.classesAdded.join(", ")}) @ ${a.element}`);
  }

  if (flagged.length > 0) {
    console.log("flagged (high severity, not auto-fixed):");
    for (const f of flagged.slice(0, 10)) {
      console.warn(`  - [${f.rule}] ${f.message} @ ${f.target}`);
    }
  }

  console.groupEnd();
}

/** Pipeline completa: lint → fix → report. */
export function runAndEmitUIAutonomyFix(pageId: string): UIAutonomyFixResult {
  const lint = runVisualLayoutLinterFromMain(pageId);
  const result = runUIAutonomyFixEngineFromMain(pageId, lint);
  emitUIAutonomyFixReport(result);
  return result;
}
