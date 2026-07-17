import type { QueryScopeKey } from "@/lib/render/query-ownership-registry";
import { DEFAULT_WEB_VITALS_BUDGET } from "@/lib/performance/performance-global-budgets";

export type WebVitalsBudget = {
  lcpMs?: number;
  inpMs?: number;
  cls?: number;
  ttfbMs?: number;
  fcpMs?: number;
};

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
  /** v6 — first-load JS uncompressed KB (route-bundle-stats). */
  maxFirstLoadJsKb?: number;
  maxRouteJsKb?: number;
  maxRouteCssKb?: number;
  maxInitialFetches?: number;
  maxWebsocketChannels?: number;
  maxReactCommitsCold?: number;
  maxMemoryMbIdle?: number;
  webVitals?: WebVitalsBudget;
};

export type PerformanceBudgetV6 = PerformanceBudget;

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
    maxFirstLoadJsKb: 1900,
    maxInitialFetches: 6,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
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
    maxPayloadKb: 48,
    maxQueries: 6,
    maxServerMs: 5,
    maxHydrationMs: 3500,
    maxClientMs: 150,
    maxFirstLoadJsKb: 1900,
    maxInitialFetches: 10,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
    restProxyId: "rest-lav-report",
    explainId: "Q1",
  },
  {
    route: "/mezzi",
    scopeKeys: ["mezzi.list"],
    label: "Mezzi list light",
    maxPayloadKb: 32,
    maxQueries: 1,
    maxServerMs: 2,
    maxHydrationMs: 2500,
    maxClientMs: 80,
    maxFirstLoadJsKb: 1900,
    maxInitialFetches: 4,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
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
    maxFirstLoadJsKb: 1900,
    maxInitialFetches: 5,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
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
    maxFirstLoadJsKb: 1900,
    maxInitialFetches: 8,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
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
    maxFirstLoadJsKb: 1900,
    maxInitialFetches: 6,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
    restProxyId: "rest-documenti",
    explainId: "Q17",
  },
  {
    route: "/impostazioni",
    scopeKeys: ["settings.payload"],
    label: "Impostazioni settings payload",
    maxPayloadKb: 12,
    maxQueries: 1,
    maxServerMs: 3,
    maxHydrationMs: 2500,
    maxClientMs: 100,
    maxFirstLoadJsKb: 1900,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
  },
  {
    route: "/sicurezza",
    scopeKeys: ["settings.payload", "security.usersPermissions"],
    label: "Sicurezza BFF settings + users",
    maxPayloadKb: 15,
    maxQueries: 2,
    maxServerMs: 4,
    maxHydrationMs: 2500,
    maxClientMs: 100,
    maxFirstLoadJsKb: 1900,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
  },
  {
    route: "/login",
    label: "Login anonimo — form shell",
    maxPayloadKb: 8,
    maxQueries: 0,
    maxServerMs: 1,
    maxHydrationMs: 2000,
    maxClientMs: 80,
    maxFirstLoadJsKb: 1700,
    webVitals: { ...DEFAULT_WEB_VITALS_BUDGET, lcpMs: 3000 },
  },
  {
    route: "/privacy-policy",
    label: "Privacy policy RSC body",
    maxPayloadKb: 6,
    maxQueries: 0,
    maxServerMs: 1,
    maxHydrationMs: 2500,
    maxClientMs: 60,
    maxFirstLoadJsKb: 1700,
    webVitals: DEFAULT_WEB_VITALS_BUDGET,
  },
  {
    route: "/offline",
    label: "Offline PWA static",
    maxPayloadKb: 4,
    maxQueries: 0,
    maxServerMs: 1,
    maxHydrationMs: 1500,
    maxClientMs: 40,
    maxFirstLoadJsKb: 1700,
    webVitals: { ...DEFAULT_WEB_VITALS_BUDGET, lcpMs: 2800 },
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
