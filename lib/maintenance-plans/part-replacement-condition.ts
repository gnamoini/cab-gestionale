import type { ReplacementCondition } from "@/lib/maintenance-plans/maintenance-enums";

export type PartDueContext = {
  condition: ReplacementCondition;
  conditionParams: Record<string, number> | null;
  executionCount: number;
  oreSinceLastReplace: number | null;
  kmSinceLastReplace: number | null;
};

export function isPartDue(ctx: PartDueContext): boolean {
  switch (ctx.condition) {
    case "sempre":
      return true;
    case "solo_se_usurato":
    case "solo_se_contaminato":
      return false;
    case "ogni_n_tagliandi": {
      const n = ctx.conditionParams?.n ?? 1;
      return n > 0 && ctx.executionCount > 0 && ctx.executionCount % n === 0;
    }
    case "ogni_n_ore": {
      const n = ctx.conditionParams?.n ?? 0;
      if (n <= 0 || ctx.oreSinceLastReplace == null) return false;
      return ctx.oreSinceLastReplace >= n;
    }
    case "ogni_n_km": {
      const n = ctx.conditionParams?.n ?? 0;
      if (n <= 0 || ctx.kmSinceLastReplace == null) return false;
      return ctx.kmSinceLastReplace >= n;
    }
    default:
      return true;
  }
}

export function partConditionRequiresOperatorChoice(condition: ReplacementCondition): boolean {
  return condition === "solo_se_usurato" || condition === "solo_se_contaminato";
}
