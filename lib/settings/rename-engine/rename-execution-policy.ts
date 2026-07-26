export { DEFAULT_RENAME_EXECUTION_POLICY } from "@/lib/settings/rename-engine/constants";
export type { RenameExecutionPolicy } from "@/lib/settings/rename-engine/types";

import type { RenameExecutionPolicy, RenameImpact } from "@/lib/settings/rename-engine/types";
import { DEFAULT_RENAME_EXECUTION_POLICY } from "@/lib/settings/rename-engine/constants";

export function shouldQueueRename(
  impact: RenameImpact,
  policy: RenameExecutionPolicy = DEFAULT_RENAME_EXECUTION_POLICY,
): boolean {
  return impact.totalUpdatable > policy.max_records_sync;
}

export function executionBatches(total: number, policy: RenameExecutionPolicy = DEFAULT_RENAME_EXECUTION_POLICY): number {
  return Math.ceil(total / policy.batch_size);
}
