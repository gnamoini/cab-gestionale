import assert from "node:assert/strict";
import {
  getAllBudgetRoutes,
  getBudgetByScopeKey,
  getBudgetForRoute,
  PERFORMANCE_BUDGETS,
} from "@/lib/performance/performance-budget-registry";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const routes = getAllBudgetRoutes();
assert.equal(routes.length, 13);
assert.deepEqual(
  [...routes].sort(),
  [
    "/dashboard",
    "/documenti",
    "/impostazioni",
    "/lavorazioni",
    "/lavorazioni-clienti",
    "/login",
    "/magazzino",
    "/mezzi",
    "/offline",
    "/privacy-policy",
    "/report",
    "/sicurezza",
    "/termini-e-condizioni",
  ].sort(),
);

for (const budget of PERFORMANCE_BUDGETS) {
  assert.ok(budget.maxPayloadKb > 0, `${budget.route} maxPayloadKb`);
  assert.ok(budget.maxQueries >= 0, `${budget.route} maxQueries`);
  assert.ok(budget.maxServerMs > 0, `${budget.route} maxServerMs`);
  assert.ok(budget.maxHydrationMs > 0, `${budget.route} maxHydrationMs`);
  assert.ok(budget.maxClientMs > 0, `${budget.route} maxClientMs`);
  if (budget.maxFirstLoadJsKb != null) {
    assert.ok(budget.maxFirstLoadJsKb > 0, `${budget.route} maxFirstLoadJsKb`);
  }
}

const lav = getBudgetForRoute("/lavorazioni");
assert.ok(lav);
assert.equal(lav.maxQueries, 2);
assert.equal(lav.maxFirstLoadJsKb, 1900);

const report = getBudgetForRoute("/report");
assert.ok(report);
assert.equal(report.maxPayloadKb, 48);

const login = getBudgetForRoute("/login");
assert.ok(login);
assert.equal(login.maxQueries, 0);

const reportScope = getBudgetByScopeKey("lavorazioni.list.report");
assert.ok(reportScope);
assert.equal(reportScope.route, "/report");

for (const budget of PERFORMANCE_BUDGETS) {
  if (!budget.scopeKeys?.length) continue;
  const matchingScope = budget.scopeKeys.find((scope) =>
    getPrefetchRoutesForScope(scope).includes(budget.route),
  );
  if (!matchingScope) continue;
  const prefetchRoutes = getPrefetchRoutesForScope(matchingScope);
  assert.ok(
    prefetchRoutes.includes(budget.route),
    `scope ${matchingScope} prefetch should include budget route ${budget.route}`,
  );
}

console.log("performance-budget-registry.test.ts OK");
