import type { DigitalDocument } from "@/lib/document-capture/model/document-model";
import { hashDocumentModelContent } from "@/lib/document-capture/model/document-model-hash";
import {
  STALE_APPLY_PLAN_ERROR_CODE,
  type ApplyPlanV41,
} from "@/lib/document-capture/model/apply-plan-v41";

export class StaleApplyPlanError extends Error {
  readonly code = STALE_APPLY_PLAN_ERROR_CODE;

  constructor() {
    super("ApplyPlan obsoleto — il DocumentModel è cambiato dopo la creazione del piano.");
    this.name = "StaleApplyPlanError";
  }
}

/** INV-17 — gate freshness ApplyPlan. */
export function assertApplyPlanFresh(plan: ApplyPlanV41, currentDocument: DigitalDocument): void {
  const currentHash = hashDocumentModelContent(currentDocument);
  if (plan.documentModelVersionHash !== currentHash) {
    throw new StaleApplyPlanError();
  }
}
