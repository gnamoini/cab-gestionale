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
  | "ordini_fornitori.list"
  | "fatturazione.list"
  | "fatturazione.openItems"
  | "fatturazione.payments"
  | "schede.bundles"
  | "dashboard.promemoria"
  | "clientPortal.lavorazioni.inCorso"
  | "clientPortal.lavorazioni.archivio"
  | "dipendenti.employees"
  | "dipendenti.monthKeys"
  | "dipendenti.entries"
  | "security.usersPermissions";

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
  "ordini_fornitori.list": "HYBRID_OWNER",
  "fatturazione.list": "HYBRID_OWNER",
  "fatturazione.openItems": "HYBRID_OWNER",
  "fatturazione.payments": "HYBRID_OWNER",
  "schede.bundles": "HYBRID_OWNER",
  "dashboard.promemoria": "CLIENT_OWNER",
  "clientPortal.lavorazioni.inCorso": "SERVER_OWNER",
  "clientPortal.lavorazioni.archivio": "SERVER_OWNER",
  "dipendenti.employees": "SERVER_OWNER",
  "dipendenti.monthKeys": "SERVER_OWNER",
  "dipendenti.entries": "HYBRID_OWNER",
  "security.usersPermissions": "SERVER_OWNER",
};

const PREFETCH_ROUTES_BY_SCOPE: Partial<Record<QueryScopeKey, readonly string[]>> = {
  "lavorazioni.list.attive": ["/lavorazioni"],
  "lavorazioni.list.report": ["/dashboard", "/report"],
  "mezzi.list": ["/mezzi"],
  "mezzi.report": ["/report"],
  "magazzino.list": ["/magazzino"],
  "magazzino.report": ["/dashboard", "/report"],
  "movimenti.list": ["/report"],
  "settings.payload": ["/dashboard", "/magazzino", "/report", "/impostazioni", "/sicurezza"],
  "report.manualEntries": ["/report"],
  "documenti.list": ["/documenti"],
  "preventivi.list": ["/preventivi"],
  "ordini_fornitori.list": ["/preventivi"],
  "fatturazione.list": ["/fatturazione"],
  "fatturazione.openItems": ["/fatturazione"],
  "fatturazione.payments": ["/fatturazione"],
  "schede.bundles": ["/dashboard", "/lavorazioni"],
  "clientPortal.lavorazioni.inCorso": ["/lavorazioni-clienti"],
  "clientPortal.lavorazioni.archivio": ["/lavorazioni-clienti"],
  "dipendenti.employees": ["/dipendenti"],
  "dipendenti.monthKeys": ["/dipendenti"],
  "dipendenti.entries": ["/dipendenti"],
  "security.usersPermissions": ["/sicurezza"],
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
  if (scope.entityType === "ordini_fornitori") return "ordini_fornitori.list";
  if (scope.entityType === "fatturazione") {
    if (variant === "openItems") return "fatturazione.openItems";
    if (variant === "payments") return "fatturazione.payments";
    return "fatturazione.list";
  }
  if (scope.entityType === "schede") return "schede.bundles";
  if (scope.entityType === "dashboard" && variant === "promemoria") return "dashboard.promemoria";
  if (scope.entityType === "dipendenti") {
    if (variant === "monthKeys") return "dipendenti.monthKeys";
    if (variant === "entries") return "dipendenti.entries";
    return "dipendenti.employees";
  }
  if (scope.entityType === "security" && variant === "usersPermissions") return "security.usersPermissions";
  return null;
}
