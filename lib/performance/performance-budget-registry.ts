import type { QueryScopeKey } from "@/lib/render/query-ownership-registry";

export type PerformanceBudget = {
  route: string;
  scopeKeys?: readonly QueryScopeKey[];
  label: string;
  maxPayloadKb: number;
  maxQueries: number;
  maxServerMs: number;
  maxHydrationMs: number;
  maxClientMs: number;
  /** REST benchmark proxy id in scripts/ops/lib/rest-benchmark-subset.mjs */
  restProxyId?: string;
  /** EXPLAIN query id in scripts/ops/lib/explain-queries.mjs */
  explainId?: string;
};

/** Cold-load performance budgets — SSOT for regression guard. */
export const PERFORMANCE_BUDGETS: readonly PerformanceBudget[] = [
  {
    route: "/lavorazioni",
    scopeKeys: ["lavorazioni.list.attive", "schede.bundles"],
    label: "Lavorazioni list + schede batch",
    maxPayloadKb: 12,
    maxQueries: 2,
    maxServerMs: 2,
    maxHydrationMs: 3000,
    maxClientMs: 100,
    restProxyId: "rest-lav-light-attive",
    explainId: "Q1",
  },
  {
    route: "/report",
    scopeKeys: [
      "lavorazioni.list.report",
      "magazzino.report",
      "mezzi.report",
      "movimenti.list",
      "report.manualEntries",
      "settings.payload",
    ],
    label: "Report BFF 6-wave",
    maxPayloadKb: 20,
    maxQueries: 6,
    maxServerMs: 5,
    maxHydrationMs: 3500,
    maxClientMs: 150,
    restProxyId: "rest-lav-report",
    explainId: "Q1",
  },
  {
    route: "/mezzi",
    scopeKeys: ["mezzi.list"],
    label: "Mezzi list light",
    maxPayloadKb: 17,
    maxQueries: 1,
    maxServerMs: 2,
    maxHydrationMs: 2500,
    maxClientMs: 80,
    restProxyId: "rest-mezzi-list",
    explainId: "Q7",
  },
  {
    route: "/magazzino",
    scopeKeys: ["magazzino.list", "settings.payload"],
    label: "Magazzino list + settings",
    maxPayloadKb: 15,
    maxQueries: 2,
    maxServerMs: 2,
    maxHydrationMs: 3000,
    maxClientMs: 100,
    restProxyId: "rest-magazzino-list",
    explainId: "Q9",
  },
  {
    route: "/dashboard",
    scopeKeys: ["lavorazioni.list.attive", "magazzino.report", "settings.payload", "schede.bundles"],
    label: "Dashboard BFF",
    maxPayloadKb: 25,
    maxQueries: 4,
    maxServerMs: 5,
    maxHydrationMs: 3500,
    maxClientMs: 120,
    restProxyId: "rest-lav-light-attive",
    explainId: "Q1",
  },
  {
    route: "/documenti",
    scopeKeys: ["documenti.list", "mezzi.list", "settings.payload"],
    label: "Documenti dashboard BFF",
    maxPayloadKb: 12,
    maxQueries: 3,
    maxServerMs: 3,
    maxHydrationMs: 3000,
    maxClientMs: 100,
    restProxyId: "rest-documenti",
    explainId: "Q17",
  },
] as const;

export function getBudgetForRoute(route: string): PerformanceBudget | undefined {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  return PERFORMANCE_BUDGETS.find((b) => b.route === normalized);
}

export function getBudgetByScopeKey(scopeKey: QueryScopeKey): PerformanceBudget | undefined {
  return PERFORMANCE_BUDGETS.find((b) => b.scopeKeys?.includes(scopeKey));
}

export function getAllBudgetRoutes(): readonly string[] {
  return PERFORMANCE_BUDGETS.map((b) => b.route);
}
