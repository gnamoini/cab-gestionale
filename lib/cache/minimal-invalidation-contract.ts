"use client";

import {
  bumpEntityVersion,
  getEntityVersionToken,
  resolveEntityCacheVersion,
} from "@/lib/cache/entity-version-registry";
import { logMicInvalidation, recordMicInvalidation } from "@/lib/cache/mic-observability";
import { getActiveCorrelationId } from "@/lib/observability/runtime-correlation-context";
import { noteAssetCacheInvalidation } from "@/lib/observability/asset-cache-warmup";
import {
  scheduleRuntimeTraceUiRender,
  traceRuntimeCoordination,
} from "@/lib/observability/runtime-coordination-tracer";
import { MIC_REGISTRY } from "@/lib/cache/mic-registry";
import type { MicEntityType, MicScope } from "@/lib/cache/mic-types";
import {
  micScopeIncludesAssets,
  micScopeIncludesReactQuery,
  micScopeIncludesReport,
  micScopeIncludesVersion,
} from "@/lib/cache/mic-types";
import { scheduleReportBroadcastRefresh } from "@/lib/report/report-refresh";
import type { CabSyncEvent } from "@/lib/sync/cab-sync-bus";
import { invalidateOperationalTruth } from "@/src/lib/runtime/truth-layer/invalidate-operational-truth";
import { invalidateRuntimeTruth } from "@/src/lib/runtime/truth-layer/invalidate-runtime-truth";
import type { QueryClient } from "@tanstack/react-query";

export type MicInvalidateInput = {
  queryClient: QueryClient;
  entityType: MicEntityType;
  entityId: string;
  scope?: MicScope;
  cabSyncEvents?: CabSyncEvent[];
  /** DB timestamp when known (`updated_at`, `meta.uploadedAt`). */
  dbVersion?: string;
  /** Optional correlation id for runtime coordination tracing. */
  correlationId?: string;
};

export { bumpEntityVersion, getEntityVersionToken, resolveEntityCacheVersion };

function fireMicServerInvalidations(
  entityType: MicEntityType,
  entityId: string,
  correlationId?: string,
): void {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (correlationId) {
    headers["X-Correlation-Id"] = correlationId;
  }
  void fetch("/api/cache/invalidate-entity", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ entityType, entityId }),
  }).catch(() => {});
}

/**
 * Minimal Invalidation Contract — single entry for coordinated cache invalidation.
 * Composes existing truth layer + version bumps + best-effort server asset wipe.
 */
export async function invalidateEntity(input: MicInvalidateInput): Promise<void> {
  const scope = input.scope ?? "full";
  const entityId = input.entityId.trim();
  if (!entityId) return;

  const entry = MIC_REGISTRY[input.entityType];
  const correlationId = input.correlationId ?? getActiveCorrelationId();
  logMicInvalidation({
    entityType: input.entityType,
    entityId,
    scope,
    correlationId,
  });
  recordMicInvalidation(input.entityType);

  traceRuntimeCoordination({
    type: "mic_invalidation_triggered",
    correlationId,
    entityType: input.entityType,
    entityId,
    scope,
    layer: "mic",
    meta: {
      versionBump: Boolean(entry.versionBump && micScopeIncludesVersion(scope)),
      pdfScopes: entry.pdfScopes.length,
      reportRefresh: Boolean(entry.reportRefresh && micScopeIncludesReport(scope)),
    },
  });

  if (micScopeIncludesVersion(scope) && entry.versionBump) {
    bumpEntityVersion(input.entityType, entityId);
  }

  if (micScopeIncludesReactQuery(scope)) {
    if (entry.useRuntimeTruth) {
      await invalidateRuntimeTruth({
        queryClient: input.queryClient,
        reason: entry.useRuntimeTruth,
      });
    } else if (entry.operationalDomain) {
      await invalidateOperationalTruth({
        queryClient: input.queryClient,
        domain: entry.operationalDomain,
        cabSyncEvents: input.cabSyncEvents,
        skipReportBroadcast: true,
      });
    }

    const extras = entry.extraQueryKeys?.(entityId) ?? [];
    if (extras.length > 0) {
      await Promise.all(
        extras.map((queryKey) =>
          input.queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
        ),
      );
    }

    traceRuntimeCoordination({
      type: "react_query_invalidated",
      correlationId,
      entityType: input.entityType,
      entityId,
      scope,
      layer: "react-query",
      meta: {
        domain: entry.operationalDomain ?? entry.useRuntimeTruth ?? null,
        extraQueryKeys: extras.length,
      },
    });
  }

  if (micScopeIncludesReport(scope) && entry.reportRefresh) {
    scheduleReportBroadcastRefresh(input.queryClient);
    traceRuntimeCoordination({
      type: "react_query_invalidated",
      correlationId,
      entityType: input.entityType,
      entityId,
      scope: "report",
      layer: "react-query",
      meta: { reportRefresh: true },
    });
  }

  if (micScopeIncludesAssets(scope) && entry.pdfScopes.length > 0) {
    traceRuntimeCoordination({
      type: "mic_invalidation_triggered",
      correlationId,
      entityType: input.entityType,
      entityId,
      scope,
      layer: "mic",
      meta: { pdfScopes: entry.pdfScopes.length, serverInvalidation: true },
    });
    fireMicServerInvalidations(input.entityType, entityId, correlationId);
  }

  noteAssetCacheInvalidation({
    entityType: input.entityType,
    entityId,
    scope,
    correlationId,
    pdfScopes: micScopeIncludesAssets(scope) ? entry.pdfScopes.length : 0,
  });

  if (correlationId) {
    scheduleRuntimeTraceUiRender(correlationId, { entityType: input.entityType, entityId });
  }
}

/** Settings write path: runtime truth + global PDF scope wipe. */
export async function invalidateMicSettings(queryClient: QueryClient): Promise<void> {
  await invalidateEntity({
    queryClient,
    entityType: "settings",
    entityId: "global",
    scope: "full",
  });
}
