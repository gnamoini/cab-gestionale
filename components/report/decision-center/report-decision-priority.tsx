"use client";

import type { DecisionPriority } from "@/lib/report/decision-center/types";

const LABELS: Record<DecisionPriority, string> = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Bassa",
};

const TONE: Record<DecisionPriority, string> = {
  critical: "bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-card))] text-[color:var(--cab-danger)]",
  high: "bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-card))] text-[color:var(--cab-warning)]",
  medium: "bg-[color:var(--cab-surface-muted)] text-[color:var(--cab-text)]",
  low: "bg-[color:var(--cab-surface-muted)] text-[color:var(--cab-text-muted)]",
};

export function ReportDecisionPriority({ priority }: { priority: DecisionPriority }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[priority]}`}>
      {LABELS[priority]}
    </span>
  );
}
