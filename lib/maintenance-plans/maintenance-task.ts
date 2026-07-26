import type { ReplacementCondition } from "@/lib/maintenance-plans/maintenance-enums";

export type MaintenanceTaskKind =
  | "ricambio"
  | "operazione"
  | "checklist"
  | "lubrificazione"
  | "controllo"
  | "misurazione";

export type MaintenanceTaskStatus = "ok" | "missing" | "extra" | "partial" | "unchecked";

export type MaintenanceTask = {
  id: string;
  kind: MaintenanceTaskKind;
  label: string;
  isRequired: boolean;
  ricambioId?: string;
  qtyExpected?: number;
  qtyActual?: number;
  replacementCondition?: ReplacementCondition;
  checked?: boolean;
  performed?: boolean;
  durationMinutes?: number;
  userModified?: boolean;
};

export type MaintenanceTaskDiff = {
  taskId: string;
  kind: MaintenanceTaskKind;
  label: string;
  status: MaintenanceTaskStatus;
  detail?: string;
};

export type ComplianceReviewReason =
  | "equivalente"
  | "sostituito"
  | "rifiutato_cliente"
  | "non_disponibile"
  | "altro";

export type ComplianceReview = {
  approved: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  adjustments: {
    taskId: string;
    reason: ComplianceReviewReason;
    note: string;
    delta: number;
  }[];
};

export const EMPTY_COMPLIANCE_REVIEW: ComplianceReview = {
  approved: false,
  adjustments: [],
};
