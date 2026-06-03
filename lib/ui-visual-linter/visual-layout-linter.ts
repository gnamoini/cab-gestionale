/**
 * Visual Layout Linter — orchestratore DEV-only.
 * Detection + scoring + reporting. Zero modifiche UI.
 */

import { detectCrossInstanceDrift, dedupeIssues } from "@/lib/ui-visual-linter/layout-diff-engine";
import { evaluateSignatureRules, shouldSkipElement, type LayoutLinterIssue } from "@/lib/ui-visual-linter/layout-rules";
import { computeLayoutScore, type LayoutScore } from "@/lib/ui-visual-linter/layout-score";
import { collectLayoutSignatures } from "@/lib/ui-visual-linter/layout-signature";

export const LAYOUT_LINTER_LOG_PREFIX = "[layout-linter]";

const MAX_EMITTED_ISSUES = 20;

export type VisualLayoutLinterResult = {
  pageId: string;
  score: LayoutScore;
  issues: LayoutLinterIssue[];
  signatureCount: number;
};

function isDevAuditEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Esegue lint layout su pageTree (main o dialog root). SSR-safe. */
export function runVisualLayoutLinter(
  root: Element | null | undefined,
  pageId: string,
): VisualLayoutLinterResult {
  const emptyScore = computeLayoutScore([]);

  if (!isDevAuditEnabled() || !root || typeof window === "undefined") {
    return { pageId, score: emptyScore, issues: [], signatureCount: 0 };
  }

  const signatures = collectLayoutSignatures(root, {
    shouldSkip: (el) => shouldSkipElement(el, pageId),
    maxPerKind: 12,
  });

  const issues: LayoutLinterIssue[] = [];

  for (const sig of signatures) {
    const cn = sig.type === "flex-group" ? sig.target : "";
    issues.push(...evaluateSignatureRules(sig, cn));
  }

  issues.push(...detectCrossInstanceDrift(signatures, pageId));

  const deduped = dedupeIssues(issues, pageId);
  const score = computeLayoutScore(deduped);

  return {
    pageId,
    score,
    issues: deduped,
    signatureCount: signatures.length,
  };
}

/** Emette warning console deduplicati (solo DEV). */
export function emitVisualLayoutLinterWarnings(result: VisualLayoutLinterResult): void {
  if (!isDevAuditEnabled()) return;

  const { pageId, score, issues } = result;

  if (issues.length === 0 && score.overall >= 95) {
    console.groupCollapsed(`${LAYOUT_LINTER_LOG_PREFIX} ${pageId} — score ${score.overall}/100 (no issues)`);
    console.log(`${LAYOUT_LINTER_LOG_PREFIX}`);
    console.log(`page: ${pageId}`);
    console.log(`score: ${score.overall}/100`);
    console.groupEnd();
    return;
  }

  console.groupCollapsed(
    `${LAYOUT_LINTER_LOG_PREFIX} ${pageId} — score ${score.overall}/100 (${issues.length} issue(s))`,
  );
  console.log(`${LAYOUT_LINTER_LOG_PREFIX}`);
  console.log(`page: ${pageId}`);
  console.log(`score: ${score.overall}/100`);
  console.log(
    `breakdown: toolbar=${score.toolbarConsistency} table=${score.tableConsistency} modal=${score.modalConsistency} spacing=${score.spacingUniformity} alignment=${score.alignmentDrift}`,
  );

  if (issues.length > 0) {
    console.log("issues:");
    const capped = issues.slice(0, MAX_EMITTED_ISSUES);
    for (const issue of capped) {
      const detail =
        issue.expected && issue.found
          ? ` (expected ${issue.expected}, found ${issue.found})`
          : "";
      console.warn(`  - ${issue.message}${detail} @ ${issue.target}`);
    }
    if (issues.length > MAX_EMITTED_ISSUES) {
      console.warn(`  … and ${issues.length - MAX_EMITTED_ISSUES} more (capped)`);
    }
  }

  console.groupEnd();
}

/** Helper: lint da main shell (uso mount/hook). */
export function runVisualLayoutLinterFromMain(pageId: string): VisualLayoutLinterResult {
  if (typeof document === "undefined") {
    return runVisualLayoutLinter(null, pageId);
  }
  const main = document.querySelector(".cab-app-shell main");
  return runVisualLayoutLinter(main, pageId);
}

/** Helper: lint modale aperta per id/descriptor. */
export function runVisualLayoutLinterOnModal(pageId: string, dialogEl: Element | null): VisualLayoutLinterResult {
  return runVisualLayoutLinter(dialogEl, `${pageId}:modal`);
}

export type { LayoutScore, LayoutLinterIssue };
