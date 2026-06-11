import { processSubmitDivergenceRollback } from "@/lib/form-ux-migration/enforcement-guardrails";
import {
  isFormSubmitTokenValid,
  type FormUxExecutionToken,
} from "@/lib/form-ux-migration/form-ux-execution-token";
import {
  isFormSubmitTransactionActive,
  isRolloutTransactionActive,
} from "@/lib/form-ux-migration/rollout-state-lock";
import type { SubmitDivergence } from "@/lib/form-ux-migration/resolve-form-submit-payload";
import type { FormUxFormId } from "@/lib/form-ux-migration/types";
import type { RolloutEnforcementResolution } from "@/lib/form-ux-migration/rollout-controller";

export function schedulePostSubmitRollbackObserver(input: {
  formId: FormUxFormId;
  divergences: SubmitDivergence[];
  executionToken: FormUxExecutionToken;
  snapshotHash: string;
}): void {
  const { formId, divergences, executionToken } = input;
  queueMicrotask(() => {
    if (!isFormSubmitTokenValid(formId, executionToken)) return;
    if (isFormSubmitTransactionActive(formId)) return;

    for (const d of divergences) {
      if (!d.critical) continue;
      if (isRolloutTransactionActive(d.formId, d.fieldId)) continue;
      processSubmitDivergenceRollback(
        d.formId,
        d.fieldId,
        d.kind,
        d.enforcement as RolloutEnforcementResolution["effectiveEnforcement"],
      );
    }
  });
}
