import type { ReplacementCondition } from "@/lib/maintenance-plans/maintenance-enums";
import { isPartDue } from "@/lib/maintenance-plans/part-replacement-condition";

export function suggestPartReplacedAtRegistration(input: {
  replacementCondition: ReplacementCondition;
  conditionParams: Record<string, number> | null;
  isRequired: boolean;
  executionCount: number;
}): boolean {
  return isPartDue({
    condition: input.replacementCondition,
    conditionParams: input.conditionParams,
    executionCount: input.executionCount,
    oreSinceLastReplace: null,
    kmSinceLastReplace: null,
  });
}
