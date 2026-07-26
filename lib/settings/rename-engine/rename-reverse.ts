import type { RenamePlan, ReverseEligibility } from "@/lib/settings/rename-engine/types";
import { invertRenamePlan } from "@/lib/settings/rename-engine/rename-plan";

export type RenameJobRecord = {
  id: string;
  kind: string;
  entity_id: string | null;
  entity_key: string | null;
  old_label: string;
  new_label: string;
  status: string;
  plan_json: RenamePlan;
  parent_job_id: string | null;
};

export function canReverseRename(
  job: RenameJobRecord,
  context: {
    currentLabelInSettings?: string;
    hasSubsequentRename?: boolean;
    hasMerge?: boolean;
  },
): ReverseEligibility {
  if (job.status !== "completed") {
    return { eligible: false, reason: "Solo job completati possono essere annullati." };
  }
  if (context.hasSubsequentRename) {
    return { eligible: false, reason: "Esiste una rinomina successiva sulla stessa entità." };
  }
  if (context.hasMerge) {
    return { eligible: false, reason: "Un merge è intervenuto sulla stessa entità." };
  }
  const current = context.currentLabelInSettings?.trim();
  if (current && current !== job.new_label.trim()) {
    return {
      eligible: false,
      reason: `Il nome è stato modificato dopo la rinomina (attuale: "${current}").`,
    };
  }
  return { eligible: true };
}

export function buildReversePlan(job: RenameJobRecord, correlationId: string): RenamePlan {
  const plan = job.plan_json;
  return { ...invertRenamePlan(plan, correlationId), entityId: plan.entityId, entityKey: plan.entityKey };
}
