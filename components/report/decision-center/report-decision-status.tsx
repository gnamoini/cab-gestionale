"use client";

import { GlobalSelect } from "@/components/gestionale/global-input";
import type { DecisionStatus } from "@/lib/report/decision-center/types";
import { globalInputFieldFilter } from "@/lib/ui/global-input";

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

  const items = [
    { value: status, label: LABELS[status] },
    ...options.map((o) => ({ value: o, label: `→ ${LABELS[o]}` })),
  ];

  return (
    <GlobalSelect
      id={`report-decision-status-${status}`}
      variant="filter"
      selectOnly
      strictFromList
      aria-label="Stato decisione"
      inputClassName={`${globalInputFieldFilter} h-9 text-xs`}
      items={items}
      value={status}
      onChange={(v) => onChange(v as DecisionStatus)}
    />
  );
}
