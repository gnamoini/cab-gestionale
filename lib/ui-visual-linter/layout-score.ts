/**
 * Visual Layout Linter — scoring 0–100 per categoria e overall.
 */

import type { LayoutLinterIssue } from "@/lib/ui-visual-linter/layout-rules";

export type LayoutScore = {
  toolbarConsistency: number;
  tableConsistency: number;
  modalConsistency: number;
  spacingUniformity: number;
  alignmentDrift: number;
  overall: number;
};

const PENALTY = {
  toolbar: 8,
  table: 10,
  modal: 8,
  spacing: 6,
  alignment: 6,
} as const;

const WEIGHTS = {
  toolbar: 0.25,
  table: 0.25,
  modal: 0.2,
  spacing: 0.15,
  alignment: 0.15,
} as const;

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function countByCategory(issues: LayoutLinterIssue[]): Record<keyof Omit<LayoutScore, "overall">, number> {
  const counts = {
    toolbarConsistency: 0,
    tableConsistency: 0,
    modalConsistency: 0,
    spacingUniformity: 0,
    alignmentDrift: 0,
  };

  for (const issue of issues) {
    switch (issue.category) {
      case "toolbar":
        counts.toolbarConsistency++;
        break;
      case "table":
        counts.tableConsistency++;
        break;
      case "modal":
        counts.modalConsistency++;
        break;
      case "spacing":
        counts.spacingUniformity++;
        break;
      case "alignment":
        counts.alignmentDrift++;
        break;
    }
  }

  return counts;
}

export function computeLayoutScore(issues: LayoutLinterIssue[]): LayoutScore {
  const counts = countByCategory(issues);

  const toolbarConsistency = clampScore(100 - counts.toolbarConsistency * PENALTY.toolbar);
  const tableConsistency = clampScore(100 - counts.tableConsistency * PENALTY.table);
  const modalConsistency = clampScore(100 - counts.modalConsistency * PENALTY.modal);
  const spacingUniformity = clampScore(100 - counts.spacingUniformity * PENALTY.spacing);
  const alignmentDrift = clampScore(100 - counts.alignmentDrift * PENALTY.alignment);

  const overall = clampScore(
    toolbarConsistency * WEIGHTS.toolbar +
      tableConsistency * WEIGHTS.table +
      modalConsistency * WEIGHTS.modal +
      spacingUniformity * WEIGHTS.spacing +
      alignmentDrift * WEIGHTS.alignment,
  );

  return {
    toolbarConsistency,
    tableConsistency,
    modalConsistency,
    spacingUniformity,
    alignmentDrift,
    overall,
  };
}

/** Soglie documentate: ≥85 coerente, ≥60 drift moderato. */
export function layoutScoreRiskLevel(overall: number): "safe" | "risk" | "review" {
  if (overall >= 85) return "safe";
  if (overall >= 60) return "risk";
  return "review";
}
