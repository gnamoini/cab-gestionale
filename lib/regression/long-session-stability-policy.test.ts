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
assert.match(globalLoading, /registerClaim = ctx\?\.registerClaim/);
assert.match(globalLoading, /\[registerClaim, unregisterClaim\]/);

const securityDash = read("components/dashboard/security-dashboard-view.tsx");
assert.match(securityDash, /usersRefetchRef/);
assert.doesNotMatch(securityDash, /runControlCenterCheck, usersQ\]/);

const queryProvider = read("src/providers/query-provider.tsx");
const pwaQueryPolicy = read("lib/pwa/pwa-query-policy.ts");
assert.match(queryProvider, /gcTime:\s*PWA_QUERY_CLIENT_DEFAULTS\.gcTime/);
assert.match(pwaQueryPolicy, /gcTime:\s*300_000/);

const lavMutations = read("src/hooks/gestionale/use-lavorazione-mutations.ts");
assert.match(lavMutations, /evictLavorazioneDomainCache/);

const ricambioRegistry = read("lib/magazzino/ricambio-stock-snapshot-registry.ts");
assert.match(ricambioRegistry, /RICAMBIO_STOCK_SNAPSHOT_REGISTRY_MAX/);
assert.match(ricambioRegistry, /getRicambioStockSnapshotRegistrySize/);

const stockEntityCache = read("lib/magazzino/stock-entity-cache.ts");
assert.match(stockEntityCache, /mergeStockEntity/);
assert.match(stockEntityCache, /evaluateStockMerge/);
assert.match(stockEntityCache, /getStockEntityRegistrySize/);

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
assert.match(soakScript, /collectLongSessionMetricsNode/);
assert.match(read("lib/observability/long-session-metrics-node.ts"), /collectLongSessionMetricsNode/);

const devHook = read("lib/observability/long-session-dev-hook.ts");
assert.match(devHook, /__cabLongSessionMetrics/);
assert.match(devHook, /__cabInfiniteListMeta/);

const soakSpec = read("e2e/soak/long-session-soak.spec.ts");
assert.match(soakSpec, /HEAP_DELTA_MB_LIMIT/);

const rlsGate = read("scripts/ops/rls-rpc-id-gate.mjs");
assert.match(rlsGate, /rls-parity-snapshot/);

const lazyEmbed = read("lib/lavorazioni/lavorazioni-lazy-mezzo-embed.ts");
assert.match(lazyEmbed, /lazyEmbedMezziOnLavorazioniListRows/);

const forcePoll = read("lib/realtime/gestionale-force-poll.ts");
assert.match(forcePoll, /NEXT_PUBLIC_GESTIONALE_FORCE_POLL/);

// Post-fix Caso 4 — F1: nessun channel postgres_changes locale su Security dashboard
const securityDashPostFix = read("components/dashboard/security-dashboard-view.tsx");
assert.doesNotMatch(securityDashPostFix, /supabase\.channel/);
assert.doesNotMatch(securityDashPostFix, /postgres_changes/);
assert.match(securityDashPostFix, /useCabSyncListener\("settings"/);
assert.match(securityDashPostFix, /useCabSyncListener\("user_permissions"/);

// Post-fix Caso 4 — F2: refreshOperational gated per reason in RBAC truth hub (non più nel bridge)
const realtimeBridge = read("src/components/gestionale-realtime-bridge.tsx");
assert.match(realtimeBridge, /isOperatorGlobalSettingsPilotPayload/);
assert.doesNotMatch(realtimeBridge, /refreshOperational:\s*true/);
const invalidateRbacTruth = read("src/lib/rbac/invalidate-rbac-truth.ts");
assert.match(invalidateRbacTruth, /refreshOperational:/);
assert.match(invalidateRbacTruth, /opts\.reason === "roleOrPermissionsChanged"/);
assert.match(invalidateRbacTruth, /opts\.reason === "appSettingsChanged"/);
assert.match(invalidateRbacTruth, /opts\.reason === "pilotChanged"/);

// Post-fix Caso 4 — F3: magazzino log feed senza listener cab-sync ridondanti
const magLogFeed = read("lib/magazzino/use-magazzino-log-feed.ts");
assert.doesNotMatch(magLogFeed, /useCabSyncListener/);

// Post-fix Caso 4 — F5: migration prune + verify SQL
const pruneMigration = read("supabase/migrations/20260709120000_realtime_prune_deprecated_supporto.sql");
assert.match(pruneMigration, /drop table public\.segnalazioni/i);
assert.match(pruneMigration, /drop table public\.support_notes/i);
const verifySchema = read("scripts/verify-schema-consolidation.sql");
assert.match(verifySchema, /20260709120000_realtime_prune_deprecated_supporto/);

const schedeHook = read("src/hooks/use-schede-store-query.ts");
assert.match(schedeHook, /lavorazioneIds/);
assert.match(schedeHook, /ensureSchedeBundlesInCache/);

const storage = read("lib/schede/lavorazioni-schede-storage.ts");
assert.match(storage, /LAVORAZIONI_SCHEDE_STORAGE_MAX_ENTRIES/);
assert.match(storage, /LAVORAZIONI_SCHEDE_STORAGE_TTL_MS/);

const visibility = read("lib/ui/gestionale-visibility-coordinator.ts");
assert.match(visibility, /registerGestionaleVisibilityHandler/);

const postgresChannel = read("lib/realtime/postgres-changes-channel.ts");
assert.match(postgresChannel, /channelLostHandled/);

const globalSelect = read("components/gestionale/global-input/global-select.tsx");
assert.match(globalSelect, /suggestionSearchText/);
assert.match(globalSelect, /isDeferPending && !editSessionRef\.current\.modified/);

// RF-05 reconnect exhaustion + RF-04 scoped polling fallback
assert.match(realtimeBridge, /reconnectExhausted/);
assert.match(realtimeBridge, /notePollingFallbackActivation\("max reconnect attempts/);
assert.doesNotMatch(realtimeBridge, /console\.warn\("\[gestionale rt\] max reconnect attempts/);
assert.match(realtimeBridge, /refetchActiveOperationalSnapshot\(qc, \{ onlyActive: true \}\)/);
assert.doesNotMatch(realtimeBridge, /invalidateAllGestionaleOperationalQueries/);

const authCtx = read("context/auth-context.tsx");
assert.match(authCtx, /registerGestionaleVisibilityHandler/);
assert.match(authCtx, /reconcileSeqRef/);
assert.match(authCtx, /AUTH_REFRESH_DEBOUNCE_MS/);

const notificationBell = read("components/gestionale/notification-center-bell.tsx");
assert.match(notificationBell, /CLIENT_TOAST_SEEN_TTL_MS/);
assert.match(notificationBell, /pruneClientToastSeen/);
assert.doesNotMatch(notificationBell, /clientToastSeenRef = useRef<Set<string>>/);

const dashboardSyncInvalidation = read("src/hooks/view/use-dashboard-sync-invalidation.ts");
assert.match(dashboardSyncInvalidation, /magDebounceRef\.current\) clearTimeout/);
assert.match(dashboardSyncInvalidation, /activityDebounceRef\.current\) clearTimeout/);
assert.match(dashboardSyncInvalidation, /useEffect\(\(\) => \{[\s\S]*return \(\) =>/);

console.log("long-session-stability-policy.test.ts OK");
