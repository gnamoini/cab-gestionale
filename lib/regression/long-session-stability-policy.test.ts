import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const cabSyncListener = read("src/hooks/use-cab-sync-listener.ts");
assert.match(cabSyncListener, /handlerRef/);
assert.match(cabSyncListener, /handlerRef\.current = handler/);
assert.doesNotMatch(cabSyncListener, /\[handler,/);

const globalLoading = read("context/global-loading-context.tsx");
assert.match(globalLoading, /const push = ctx\?\.push/);
assert.match(globalLoading, /\[push\]/);

const securityDash = read("components/dashboard/security-dashboard-view.tsx");
assert.match(securityDash, /usersRefetchRef/);
assert.doesNotMatch(securityDash, /runControlCenterCheck, usersQ\]/);

const queryProvider = read("src/providers/query-provider.tsx");
assert.match(queryProvider, /gcTime:\s*300_000/);

const lavMutations = read("src/hooks/gestionale/use-lavorazione-mutations.ts");
assert.match(lavMutations, /evictLavorazioneDomainCache/);

const ricambioRegistry = read("lib/magazzino/ricambio-stock-snapshot-registry.ts");
assert.match(ricambioRegistry, /RICAMBIO_STOCK_SNAPSHOT_REGISTRY_MAX/);
assert.match(ricambioRegistry, /getRicambioStockSnapshotRegistrySize/);

const scortaSync = read("lib/magazzino/scorta-adjust-sync.ts");
assert.match(scortaSync, /queues\.delete\(ricambioId\)/);

const adminNotif = read("lib/lavorazioni/admin-notification-store.ts");
assert.match(adminNotif, /ensureStorageBridgeListener/);
assert.match(adminNotif, /storageBridgeAttached/);

const syncTransport = read("src/lib/runtime/sync/sync-transport-controller.ts");
assert.match(syncTransport, /POLL_BACKOFF_AFTER_MS/);
assert.match(syncTransport, /scheduleNextPoll/);

const invalidateTargets = read("src/lib/react-query/invalidate-targets.ts");
assert.match(invalidateTargets, /trySurgicalSchedeInvalidation/);
assert.match(invalidateTargets, /refreshSchedeBundleSliceForSchedaId/);

const cabSyncBus = read("lib/sync/cab-sync-bus.ts");
assert.match(cabSyncBus, /getCabSyncListenerCount/);

const soakScript = read("scripts/long-session-soak-audit.ts");
assert.match(soakScript, /collectLongSessionMetrics/);

const devHook = read("lib/observability/long-session-dev-hook.ts");
assert.match(devHook, /__cabLongSessionMetrics/);

const forcePoll = read("lib/realtime/gestionale-force-poll.ts");
assert.match(forcePoll, /NEXT_PUBLIC_GESTIONALE_FORCE_POLL/);

const schedeHook = read("src/hooks/use-schede-store-query.ts");
assert.match(schedeHook, /lavorazioneIds/);
assert.match(schedeHook, /ensureSchedeBundlesInCache/);

const storage = read("lib/schede/lavorazioni-schede-storage.ts");
assert.match(storage, /LAVORAZIONI_SCHEDE_STORAGE_MAX_ENTRIES/);
assert.match(storage, /LAVORAZIONI_SCHEDE_STORAGE_TTL_MS/);

const visibility = read("lib/ui/gestionale-visibility-coordinator.ts");
assert.match(visibility, /registerGestionaleVisibilityHandler/);

const authCtx = read("context/auth-context.tsx");
assert.match(authCtx, /registerGestionaleVisibilityHandler/);

console.log("long-session-stability-policy.test.ts OK");
