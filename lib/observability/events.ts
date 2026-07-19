import {
  noteHydrationMismatch,
  noteOperationalInvalidateBurst,
  notePerfSlowBurst,
  noteStorageDeleteFailure,
} from "@/lib/observability/degradation-detector";
import { gestionaleLogger } from "@/lib/observability/logger";
import { recordHealthMetric } from "@/lib/observability/runtime-health";
import type { ObsOperation } from "@/lib/observability/types";

export const RuntimeEvents = {
  authLoginSuccess: "auth.login.success",
  authLoginFailed: "auth.login.failed",
  authLogout: "auth.logout",
  authSessionInvalid: "auth.session.invalid",
  authRestoreDuration: "auth.restore.duration",
  rbacResolveStart: "rbac.resolve.start",
  rbacResolveSuccess: "rbac.resolve.success",
  rbacResolveFailed: "rbac.resolve.failed",
  documentiUploadSuccess: "documenti.upload.success",
  documentiUploadFailed: "documenti.upload.failed",
  documentiDeleteSuccess: "documenti.delete.success",
  documentiDeleteFailed: "documenti.delete.failed",
  lavorazioneDocumentsDelete: "lavorazione_documents.delete",
  reportDataReady: "report.data.ready",
  reportDataError: "report.data.error",
  dashboardLoadDuration: "dashboard.load.duration",
  cacheInvalidateTruth: "cache.invalidate.truth",
  cacheInvalidateTruthSpike: "cache.invalidate.truth.spike",
  cacheInvalidateTruthCoalesced: "cache.invalidate.truth.coalesced",
  cacheInvalidateOperational: "cache.invalidate.operational",
  realtimeFlush: "realtime.flush",
  realtimeBurst: "realtime.burst",
  realtimeReconnect: "realtime.reconnect",
  realtimePollingFallback: "realtime.polling.fallback",
  rbacPermissionMismatch: "rbac.permission.mismatch",
  runtimeHydrationMismatch: "runtime.hydration.mismatch",
  storageDeleteFailure: "storage.delete.failure",
  perfSlow: "perf.slow",
  deprecatedUsage: "deprecated.usage",
} as const;

export type RuntimeEventName = (typeof RuntimeEvents)[keyof typeof RuntimeEvents];

const EVENT_LEVEL: Record<string, "debug" | "info" | "warn" | "error"> = {
  [RuntimeEvents.authLoginSuccess]: "info",
  [RuntimeEvents.authLoginFailed]: "warn",
  [RuntimeEvents.authLogout]: "info",
  [RuntimeEvents.authSessionInvalid]: "warn",
  [RuntimeEvents.authRestoreDuration]: "info",
  [RuntimeEvents.rbacResolveStart]: "debug",
  [RuntimeEvents.rbacResolveSuccess]: "info",
  [RuntimeEvents.rbacResolveFailed]: "warn",
  [RuntimeEvents.documentiUploadSuccess]: "info",
  [RuntimeEvents.documentiUploadFailed]: "warn",
  [RuntimeEvents.documentiDeleteSuccess]: "info",
  [RuntimeEvents.documentiDeleteFailed]: "warn",
  [RuntimeEvents.lavorazioneDocumentsDelete]: "info",
  [RuntimeEvents.reportDataReady]: "info",
  [RuntimeEvents.reportDataError]: "error",
  [RuntimeEvents.dashboardLoadDuration]: "info",
  [RuntimeEvents.cacheInvalidateTruth]: "debug",
  [RuntimeEvents.cacheInvalidateTruthSpike]: "warn",
  [RuntimeEvents.cacheInvalidateTruthCoalesced]: "debug",
  [RuntimeEvents.cacheInvalidateOperational]: "debug",
  [RuntimeEvents.realtimeFlush]: "debug",
  [RuntimeEvents.realtimeBurst]: "warn",
  [RuntimeEvents.realtimeReconnect]: "debug",
  [RuntimeEvents.realtimePollingFallback]: "warn",
  [RuntimeEvents.rbacPermissionMismatch]: "warn",
  [RuntimeEvents.runtimeHydrationMismatch]: "error",
  [RuntimeEvents.storageDeleteFailure]: "warn",
  [RuntimeEvents.perfSlow]: "warn",
  [RuntimeEvents.deprecatedUsage]: "info",
};

const EVENT_OPERATION: Partial<Record<RuntimeEventName, ObsOperation>> = {
  [RuntimeEvents.authLoginSuccess]: "auth",
  [RuntimeEvents.authLoginFailed]: "auth",
  [RuntimeEvents.authLogout]: "auth",
  [RuntimeEvents.authSessionInvalid]: "auth",
  [RuntimeEvents.authRestoreDuration]: "auth",
  [RuntimeEvents.rbacResolveStart]: "rbac",
  [RuntimeEvents.rbacResolveSuccess]: "rbac",
  [RuntimeEvents.rbacResolveFailed]: "rbac",
  [RuntimeEvents.documentiUploadSuccess]: "documenti",
  [RuntimeEvents.documentiUploadFailed]: "documenti",
  [RuntimeEvents.documentiDeleteSuccess]: "documenti",
  [RuntimeEvents.documentiDeleteFailed]: "documenti",
  [RuntimeEvents.lavorazioneDocumentsDelete]: "documenti",
  [RuntimeEvents.reportDataReady]: "report",
  [RuntimeEvents.reportDataError]: "report",
  [RuntimeEvents.dashboardLoadDuration]: "report",
  [RuntimeEvents.cacheInvalidateTruth]: "cache",
  [RuntimeEvents.cacheInvalidateTruthSpike]: "cache",
  [RuntimeEvents.cacheInvalidateTruthCoalesced]: "cache",
  [RuntimeEvents.cacheInvalidateOperational]: "cache",
  [RuntimeEvents.realtimeFlush]: "realtime",
  [RuntimeEvents.realtimeBurst]: "realtime",
  [RuntimeEvents.realtimeReconnect]: "realtime",
  [RuntimeEvents.realtimePollingFallback]: "realtime",
  [RuntimeEvents.rbacPermissionMismatch]: "rbac",
  [RuntimeEvents.runtimeHydrationMismatch]: "system",
  [RuntimeEvents.storageDeleteFailure]: "documenti",
};

/** Tracking eventi runtime — solo console strutturata (no backend). */
export function trackRuntimeEvent(
  name: RuntimeEventName,
  meta?: Record<string, unknown> & { durationMs?: number },
): void {
  const level = EVENT_LEVEL[name] ?? "info";
  const { durationMs, ...rest } = meta ?? {};
  const payload = {
    event: name,
    operation: EVENT_OPERATION[name],
    durationMs,
    meta: Object.keys(rest).length > 0 ? rest : undefined,
  };
  gestionaleLogger[level](name, payload);

  if (durationMs != null) {
    if (name === RuntimeEvents.authRestoreDuration) recordHealthMetric("authRestoreMs", durationMs);
    if (name === RuntimeEvents.dashboardLoadDuration) recordHealthMetric("dashboardLoadMs", durationMs);
    if (name === RuntimeEvents.reportDataReady) recordHealthMetric("reportLoadMs", durationMs);
  }
  if (name === RuntimeEvents.storageDeleteFailure) noteStorageDeleteFailure();
  if (name === RuntimeEvents.runtimeHydrationMismatch) noteHydrationMismatch();
  if (name === RuntimeEvents.perfSlow) notePerfSlowBurst();
  if (name === RuntimeEvents.cacheInvalidateOperational) noteOperationalInvalidateBurst();
}
