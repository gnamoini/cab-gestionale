import { buildRequestContextFromUrl } from "@/lib/decision/request-context";
import { getCachePolicy } from "@/lib/decision/request-decision-registry";
import type { QueryScopeKey } from "@/lib/render/query-ownership-registry";

/** Maps SSR prefetch scope to RDR cache policy hint (read-only; does not change RQ keys). */
const PREFETCH_ROUTE_BY_SCOPE: Partial<Record<QueryScopeKey, string>> = {
  "settings.payload": "/api/settings/payload",
  "magazzino.list": "/api/magazzino/list",
  "mezzi.list": "/api/mezzi/list",
  "lavorazioni.list.attive": "/api/lavorazioni/list",
};

export function getPrefetchCachePolicyHint(scopeKey: QueryScopeKey): {
  cacheable: boolean;
  ttlSeconds: number;
} {
  const route = PREFETCH_ROUTE_BY_SCOPE[scopeKey] ?? `/prefetch/${scopeKey}`;
  const ctx = buildRequestContextFromUrl(route, "GET", "server");
  const policy = getCachePolicy(ctx);
  return { cacheable: policy.cacheable, ttlSeconds: policy.ttl };
}
