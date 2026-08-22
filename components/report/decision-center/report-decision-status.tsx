"use client";

import type { DecisionStatus } from "@/lib/report/decision-center/types";

const LABELS: Record<DecisionStatus, string> = {
  new: "Nuova",
  acknowledged: "Presa in carico",
  monitoring: "Da monitorare",
  resolved: "Risolta",
  dismissed: "Ignorata",
};

export function ReportDecisionStatus({
  status,
  onChange,
  canWrite,
}: {
  status: DecisionStatus;
  canWrite?: boolean;
  onChange?: (next: DecisionStatus) => void;
}) {
  if (!canWrite || !onChange) {
    return <span className="text-xs text-[color:var(--cab-text-muted)]">{LABELS[status]}</span>;
  }

  const options: DecisionStatus[] =
    status === "new"
      ? ["acknowledged", "monitoring", "dismissed"]
      : status === "acknowledged"
        ? ["monitoring", "resolved", "dismissed"]
        : status === "monitoring"
          ? ["resolved", "dismissed"]
          : [];

  if (!options.length) {
    return <span className="text-xs text-[color:var(--cab-text-muted)]">{LABELS[status]}</span>;
  }

  return (
    <select
      className="h-9 rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2 py-1 text-xs text-[color:var(--cab-text)] shadow-sm"
      value={status}
      onChange={(e) => onChange(e.target.value as DecisionStatus)}
      aria-label="Stato decisione"
    >
      <option value={status}>{LABELS[status]}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          → {LABELS[o]}
        </option>
      ))}
    </select>
  );
}
