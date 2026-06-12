import { isHydrationConsistencyAuditEnabled } from "@/lib/observability/config";
import type { QueryScopeKey } from "@/lib/render/query-ownership-registry";

const expectedKeys = new Map<string, readonly unknown[]>();
const recentFetches = new Map<string, { at: number; count: number }>();
const mismatches: Array<{ scopeKey: string; expected?: readonly unknown[]; actual?: readonly unknown[] }> = [];

const DUPLICATE_WINDOW_MS = 500;

function stableKeyString(key: readonly unknown[]): string {
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

export function registerExpectedQueryKey(scopeKey: QueryScopeKey | string, queryKey: readonly unknown[]): void {
  if (!isHydrationConsistencyAuditEnabled()) return;
  expectedKeys.set(String(scopeKey), queryKey);
}

export function recordHydrationQueryFetch(queryKey: readonly unknown[]): void {
  if (!isHydrationConsistencyAuditEnabled()) return;
  const key = stableKeyString(queryKey);
  const now = Date.now();
  const prev = recentFetches.get(key);
  if (prev && now - prev.at < DUPLICATE_WINDOW_MS) {
    prev.count += 1;
    if (prev.count >= 2) {
      console.warn("[HydrationAudit] duplicate fetch in window", { queryKey });
    }
    recentFetches.set(key, prev);
    return;
  }
  recentFetches.set(key, { at: now, count: 1 });
}

export function auditDehydratedKeys(cachedKeys: ReadonlyArray<readonly unknown[]>): void {
  if (!isHydrationConsistencyAuditEnabled()) return;
  for (const [scopeKey, expected] of expectedKeys.entries()) {
    const expectedStr = stableKeyString(expected);
    const found = cachedKeys.some((k) => stableKeyString(k) === expectedStr);
    if (!found) {
      mismatches.push({ scopeKey, expected });
    }
  }
}

export function getHydrationMismatches(): ReadonlyArray<(typeof mismatches)[number]> {
  return mismatches;
}

export function resetHydrationConsistencyAudit(): void {
  expectedKeys.clear();
  recentFetches.clear();
  mismatches.length = 0;
}

export function printHydrationConsistencyReport(): void {
  if (!isHydrationConsistencyAuditEnabled() || typeof console === "undefined") return;
  console.groupCollapsed("[RenderPath] hydration audit");
  console.log("expected scopes", expectedKeys.size);
  if (mismatches.length > 0) console.table(mismatches);
  else console.log("no mismatches recorded");
  console.groupEnd();
}
