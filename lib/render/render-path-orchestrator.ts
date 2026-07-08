import {
  LAVORAZIONI_ATTIVE_LIGHT_FILTERS,
  LAVORAZIONI_REPORT_FILTERS,
} from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import { normalizeLavorazioniFilters } from "@/lib/domain/normalize-filters";
import { lavorazioniInfiniteSeedFromRows } from "@/lib/lavorazioni/lavorazioni-infinite-cache";
import { isServerListPaginationEnabled } from "@/lib/performance/list-pagination-rollout";
import { buildLavorazioniListKey } from "@/lib/react-query/build-list-keys";
import {
  documentiListQueryKey,
  lavorazioniListQueryKey,
  magazzinoListQueryKey,
  mezziListQueryKey,
  movimentiListQueryKey,
  ordiniFornitoriListQueryKey,
  preventiviRecordsQueryKey,
  reportManualEntriesQueryKey,
  settingsPayloadQueryKey,
} from "@/lib/render/query-key-factory";
import {
  getQueryOwnership,
  shouldPrefetchOnServer,
  type EntityQueryScope,
  type QueryScopeKey,
  scopeKeyFromEntity,
} from "@/lib/render/query-ownership-registry";
import { isHydrationConsistencyAuditEnabled } from "@/lib/observability/config";
import { registerExpectedQueryKey } from "@/lib/render/hydration-consistency-audit";

export type RenderLifecycle = "server_seed" | "client_only" | "hybrid_seed";

export type RenderPathResolution = {
  scopeKey: QueryScopeKey;
  ownership: ReturnType<typeof getQueryOwnership>;
  prefetchOnServer: boolean;
  queryKey: readonly unknown[];
  lifecycle: RenderLifecycle;
};

function lifecycleFromOwnership(ownership: ReturnType<typeof getQueryOwnership>): RenderLifecycle {
  if (ownership === "SERVER_OWNER") return "server_seed";
  if (ownership === "HYBRID_OWNER") return "hybrid_seed";
  return "client_only";
}

function queryKeyForScope(scopeKey: QueryScopeKey): readonly unknown[] {
  switch (scopeKey) {
    case "lavorazioni.list.attive":
      if (isServerListPaginationEnabled()) {
        return buildLavorazioniListKey(normalizeLavorazioniFilters(LAVORAZIONI_ATTIVE_LIGHT_FILTERS), false);
      }
      return lavorazioniListQueryKey(LAVORAZIONI_ATTIVE_LIGHT_FILTERS, false);
    case "lavorazioni.list.chiuse":
      return lavorazioniListQueryKey({ archived: true, fetchMode: "light" }, false);
    case "lavorazioni.list.report":
      return lavorazioniListQueryKey(LAVORAZIONI_REPORT_FILTERS, false);
    case "mezzi.list":
      return mezziListQueryKey("list", null);
    case "mezzi.report":
      return mezziListQueryKey("report", null);
    case "magazzino.list":
      return magazzinoListQueryKey("list", null);
    case "magazzino.report":
      return magazzinoListQueryKey("report", null);
    case "movimenti.list":
      return movimentiListQueryKey(null);
    case "settings.payload":
      return settingsPayloadQueryKey();
    case "report.manualEntries":
      return reportManualEntriesQueryKey();
    case "documenti.list":
      return documentiListQueryKey(null);
    case "preventivi.list":
      return preventiviRecordsQueryKey();
    case "ordini_fornitori.list":
      return ordiniFornitoriListQueryKey();
    case "schede.bundles":
      return ["schede", "bundles"] as const;
    case "dashboard.promemoria":
      return ["dashboard-promemoria"] as const;
    case "dashboard.log":
      return ["log_modifiche"] as const;
    default: {
      const _exhaustive: never = scopeKey;
      return [_exhaustive];
    }
  }
}

export function resolveInitialLoad(input: {
  scopeKey: QueryScopeKey;
}): RenderPathResolution {
  const ownership = getQueryOwnership(input.scopeKey);
  const queryKey = queryKeyForScope(input.scopeKey);
  if (isHydrationConsistencyAuditEnabled()) {
    registerExpectedQueryKey(input.scopeKey, queryKey);
  }
  return {
    scopeKey: input.scopeKey,
    ownership,
    prefetchOnServer: shouldPrefetchOnServer(input.scopeKey),
    queryKey,
    lifecycle: lifecycleFromOwnership(ownership),
  };
}

export function resolveInitialLoadFromEntity(scope: EntityQueryScope): RenderPathResolution | null {
  const scopeKey = scopeKeyFromEntity(scope);
  if (!scopeKey) return null;
  return resolveInitialLoad({ scopeKey });
}

function stableKeyString(key: readonly unknown[]): string {
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

export function assertQueryKeyAligned(
  serverKey: readonly unknown[],
  clientKey: readonly unknown[],
  context: string,
): void {
  if (!isHydrationConsistencyAuditEnabled()) return;
  const a = stableKeyString(serverKey);
  const b = stableKeyString(clientKey);
  if (a !== b) {
    console.warn("[RenderPath] query key drift", { context, serverKey, clientKey });
  }
}
