/** ApplyPlan v4.1 — INV-17 freshness. */

export type ApplyOperationKind = "create_intervention" | "update_schede" | "link_mezzo";

export type ApplyOperation = {
  kind: ApplyOperationKind;
  interventionCandidateId?: string;
  lavorazioneId?: string;
};

export type EntityCreates = {
  mezzo?: boolean;
  lavorazioniScheda?: boolean;
  ricambiScheda?: boolean;
};

export type ApplyPlanV41 = {
  sourceValidationHash: string;
  sourceInterpretationHash: string;
  documentModelVersionHash: string;
  ruleSetVersion: string;
  validationEngineVersion: string;
  projectorVersion: string;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  operations: ApplyOperation[];
  approvedCreates: EntityCreates;
};

export const STALE_APPLY_PLAN_ERROR_CODE = "STALE_APPLY_PLAN" as const;
