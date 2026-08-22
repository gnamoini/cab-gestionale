/** SSOT types for Sprint 2.6 bundle ranking / analyzer. */

export type ReachScope =
  | "application"
  | "public"
  | "authenticated"
  | "gestionale"
  | "route";

export type GlobalReach = {
  allRoutes: number;
  publicRoutes: number;
  authenticatedRoutes: number;
  gestionaleRoutes: number;
};

export type DuplicateSeverity = "none" | "low" | "medium" | "high";

export const DUPLICATE_ACTION_THRESHOLD_KB = 15;

const PUBLIC_ROUTE_PREFIXES = ["/login", "/privacy-policy", "/termini-e-condizioni", "/offline", "/r/"];
const PUBLIC_EXACT = new Set([
  "/login",
  "/login/reset-password",
  "/privacy-policy",
  "/termini-e-condizioni",
  "/offline",
]);

export function classifyRoute(route: string): {
  isPublic: boolean;
  isGestionale: boolean;
  isAuthenticated: boolean;
} {
  const isPublic =
    PUBLIC_EXACT.has(route) ||
    PUBLIC_ROUTE_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`) || route.startsWith(p));
  const isGestionale =
    !isPublic &&
    !route.startsWith("/api/") &&
    route !== "/" &&
    !route.startsWith("/_not-found");
  const isAuthenticated = !isPublic;
  return { isPublic, isGestionale, isAuthenticated };
}

export function computeGlobalReach(routeHits: string[], totalRoutes: number): GlobalReach {
  const total = totalRoutes || 1;
  let publicCount = 0;
  let gestionaleCount = 0;
  let authCount = 0;
  for (const r of routeHits) {
    const c = classifyRoute(r);
    if (c.isPublic) publicCount++;
    if (c.isGestionale) gestionaleCount++;
    if (c.isAuthenticated) authCount++;
  }
  const round = (n: number) => Math.round((n / total) * 1000) / 1000;
  return {
    allRoutes: round(routeHits.length),
    publicRoutes: round(publicCount),
    authenticatedRoutes: round(authCount),
    gestionaleRoutes: round(gestionaleCount),
  };
}

export function inferReachScope(reach: GlobalReach): ReachScope {
  if (reach.allRoutes >= 0.95) return "application";
  if (reach.publicRoutes >= 0.5 && reach.gestionaleRoutes < 0.3) return "public";
  if (reach.gestionaleRoutes >= 0.5) return "gestionale";
  if (reach.authenticatedRoutes >= 0.5) return "authenticated";
  return "route";
}

export function effectiveReachForScope(reach: GlobalReach, scope: ReachScope): number {
  switch (scope) {
    case "application":
      return reach.allRoutes;
    case "public":
      return reach.publicRoutes;
    case "authenticated":
      return reach.authenticatedRoutes;
    case "gestionale":
      return reach.gestionaleRoutes;
    case "route":
      return Math.min(reach.allRoutes, 0.2);
    default:
      return reach.allRoutes;
  }
}

export function duplicateSeverityFromKb(duplicatedKb: number): DuplicateSeverity {
  if (duplicatedKb < DUPLICATE_ACTION_THRESHOLD_KB) return duplicatedKb < 5 ? "none" : "low";
  if (duplicatedKb <= 40) return "medium";
  return "high";
}

export function bundleImpactScoreV2(
  gzipKb: number,
  effectiveReach: number,
  firstLoadFactor: number,
): number {
  return Math.round(gzipKb * effectiveReach * firstLoadFactor * 10) / 10;
}
