import type { FormulaTraceStep } from "@/lib/health-score/types";

export function appendTrace(...steps: FormulaTraceStep[][]): FormulaTraceStep[] {
  return steps.flat();
}
