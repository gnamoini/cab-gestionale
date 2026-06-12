export type QueryOwnership = "SERVER_OWNER" | "CLIENT_OWNER" | "HYBRID_OWNER";

export type EntityQueryScope = {
  entityType: string;
  variant?: "list" | "report" | "detail" | "payload" | string;
  entityId?: string;
  route?: string;
};

/** Stable scope identifiers for render-path orchestration. */
export type QueryScopeKey =
  | "lavorazioni.list.attive"
  | "lavorazioni.list.chiuse"
  | "lavorazioni.list.report"
  | "mezzi.list"
  | "mezzi.report"
  | "magazzino.list"
  | "magazzino.report"
  | "movimenti.list"
  | "settings.payload"
  | "report.manualEntries"
  | "documenti.list"
  | "preventivi.list"
  | "schede.bundles"
  | "dashboard.promemoria"
  | "dashboard.log";

const OWNERSHIP_BY_SCOPE: Record<QueryScopeKey, QueryOwnership> = {
  "lavorazioni.list.attive": "SERVER_OWNER",
  "lavorazioni.list.chiuse": "CLIENT_OWNER",
  "lavorazioni.list.report": "SERVER_OWNER",
  "mezzi.list": "SERVER_OWNER",
  "mezzi.report": "SERVER_OWNER",
  "magazzino.list": "SERVER_OWNER",
  "magazzino.report": "SERVER_OWNER",
  "movimenti.list": "SERVER_OWNER",
  "settings.payload": "SERVER_OWNER",
  "report.manualEntries": "SERVER_OWNER",
  "documenti.list": "HYBRID_OWNER",
  "preventivi.list": "HYBRID_OWNER",
  "schede.bundles": "HYBRID_OWNER",
  "dashboard.promemoria": "CLIENT_OWNER",
  "dashboard.log": "CLIENT_OWNER",
};

const PREFETCH_ROUTES_BY_SCOPE: Partial<Record<QueryScopeKey, readonly string[]>> = {
  "lavorazioni.list.attive": ["/dashboard", "/lavorazioni"],
  "lavorazioni.list.report": ["/report"],
  "mezzi.list": ["/mezzi"],
  "mezzi.report": ["/report"],
  "magazzino.list": ["/magazzino"],
  "magazzino.report": ["/dashboard", "/report"],
  "movimenti.list": ["/report"],
  "settings.payload": ["/dashboard", "/magazzino", "/report", "/impostazioni"],
  "report.manualEntries": ["/report"],
  "documenti.list": ["/documenti"],
  "preventivi.list": ["/preventivi"],
  "schede.bundles": ["/dashboard", "/lavorazioni"],
};

export function getQueryOwnership(scopeKey: QueryScopeKey): QueryOwnership {
  return OWNERSHIP_BY_SCOPE[scopeKey];
}

export function shouldPrefetchOnServer(scopeKey: QueryScopeKey): boolean {
  const ownership = getQueryOwnership(scopeKey);
  return ownership === "SERVER_OWNER" || ownership === "HYBRID_OWNER";
}

export function shouldSkipClientInitialFetch(scopeKey: QueryScopeKey, hasDehydratedData: boolean): boolean {
  const ownership = getQueryOwnership(scopeKey);
  if (ownership === "SERVER_OWNER" && hasDehydratedData) return true;
  if (ownership === "HYBRID_OWNER" && hasDehydratedData) return true;
  return false;
}

export function getPrefetchRoutesForScope(scopeKey: QueryScopeKey): readonly string[] {
  return PREFETCH_ROUTES_BY_SCOPE[scopeKey] ?? [];
}

export function scopeKeyFromEntity(scope: EntityQueryScope): QueryScopeKey | null {
  const variant = scope.variant ?? "list";
  if (scope.entityType === "lavorazioni") {
    if (variant === "report") return "lavorazioni.list.report";
    if (variant === "chiuse") return "lavorazioni.list.chiuse";
    return "lavorazioni.list.attive";
  }
  if (scope.entityType === "mezzi") {
    return variant === "report" ? "mezzi.report" : "mezzi.list";
  }
  if (scope.entityType === "magazzino") {
    return variant === "report" ? "magazzino.report" : "magazzino.list";
  }
  if (scope.entityType === "movimenti") return "movimenti.list";
  if (scope.entityType === "settings" && variant === "payload") return "settings.payload";
  if (scope.entityType === "report" && variant === "manualEntries") return "report.manualEntries";
  if (scope.entityType === "documenti") return "documenti.list";
  if (scope.entityType === "preventivi") return "preventivi.list";
  if (scope.entityType === "schede") return "schede.bundles";
  if (scope.entityType === "dashboard" && variant === "promemoria") return "dashboard.promemoria";
  if (scope.entityType === "dashboard" && variant === "log") return "dashboard.log";
  return null;
}
