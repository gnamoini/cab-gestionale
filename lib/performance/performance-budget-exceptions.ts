/**
 * Temporary performance budget exceptions — require label `perf-budget-exception` + ADR note.
 */

export type PerformanceBudgetException = {
  route: string;
  metric: string;
  reason: string;
  approvedOn: string;
  expiresOn: string;
};

/** Active allowlist — empty by default; add only with explicit approval. */
export const PERFORMANCE_BUDGET_EXCEPTIONS: readonly PerformanceBudgetException[] = [];

export function getActiveBudgetExceptions(at = new Date()): PerformanceBudgetException[] {
  const now = at.getTime();
  return PERFORMANCE_BUDGET_EXCEPTIONS.filter((e) => new Date(e.expiresOn).getTime() >= now);
}

export function isBudgetExceptionActive(route: string, metric: string, at = new Date()): boolean {
  return getActiveBudgetExceptions(at).some((e) => e.route === route && e.metric === metric);
}
