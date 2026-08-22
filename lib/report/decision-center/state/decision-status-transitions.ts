import type { DecisionStatus } from "@/lib/report/decision-center/types";

const ALLOWED: Record<DecisionStatus, readonly DecisionStatus[]> = {
  new: ["acknowledged", "monitoring", "dismissed"],
  acknowledged: ["monitoring", "resolved", "dismissed"],
  monitoring: ["resolved", "dismissed"],
  resolved: [],
  dismissed: [],
};

export function canTransitionDecisionStatus(from: DecisionStatus, to: DecisionStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertDecisionStatusTransition(from: DecisionStatus, to: DecisionStatus): void {
  if (!canTransitionDecisionStatus(from, to)) {
    throw new Error(`Invalid decision status transition: ${from} → ${to}`);
  }
}
