import assert from "node:assert/strict";
import {
  getAllBudgetRoutes,
  getBudgetByScopeKey,
  getBudgetForRoute,
  PERFORMANCE_BUDGETS,
} from "@/lib/performance/performance-budget-registry";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const routes = getAllBudgetRoutes();
assert.equal(routes.length, 6);
assert.deepEqual(
  [...routes].sort(),
  ["/dashboard", "/documenti", "/lavorazioni", "/magazzino", "/mezzi", "/report"].sort(),
);

for (const budget of PERFORMANCE_BUDGETS) {
  assert.ok(budget.maxPayloadKb > 0, `${budget.route} maxPayloadKb`);
  assert.ok(budget.maxQueries > 0, `${budget.route} maxQueries`);
  assert.ok(budget.maxServerMs > 0, `${budget.route} maxServerMs`);
  assert.ok(budget.maxHydrationMs > 0, `${budget.route} maxHydrationMs`);
  assert.ok(budget.maxClientMs > 0, `${budget.route} maxClientMs`);
}

const lav = getBudgetForRoute("/lavorazioni");
assert.ok(lav);
assert.equal(lav.maxQueries, 2);

const reportScope = getBudgetByScopeKey("lavorazioni.list.report");
assert.ok(reportScope);
assert.equal(reportScope.route, "/report");

for (const budget of PERFORMANCE_BUDGETS) {
  const primaryScope = budget.scopeKeys?.[0];
  if (!primaryScope) continue;
  const prefetchRoutes = getPrefetchRoutesForScope(primaryScope);
  if (prefetchRoutes.length > 0) {
    assert.ok(
      prefetchRoutes.includes(budget.route),
      `primary scope ${primaryScope} prefetch should include budget route ${budget.route}`,
    );
  }
}

console.log("performance-budget-registry.test.ts OK");
