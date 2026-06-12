"use client";

import {
  getAssetCacheEvents,
  getAssetHotspots,
  getAverageAssetLatency,
  getCacheHitRatio,
  getCacheHitRatioByEntity,
  printAssetHotspots,
  printCacheReport,
  resetAssetCacheTelemetry,
} from "@/lib/observability/asset-cache-telemetry";
import { isAssetCacheTelemetryEnabled } from "@/lib/observability/config";
import { getAssetCacheInvalidationHints } from "@/lib/observability/asset-cache-warmup";
import { useEffect } from "react";

export type GestionaleAssetCacheDebug = {
  report: typeof printCacheReport;
  hotspots: typeof printAssetHotspots;
  ratio: typeof getCacheHitRatio;
  ratioByEntity: typeof getCacheHitRatioByEntity;
  latency: typeof getAverageAssetLatency;
  events: typeof getAssetCacheEvents;
  reset: typeof resetAssetCacheTelemetry;
  invalidationHints: typeof getAssetCacheInvalidationHints;
};

declare global {
  interface Window {
    __GESTIONALE_ASSET_CACHE__?: GestionaleAssetCacheDebug;
  }
}

export function mountAssetCacheDebug(): void {
  if (!isAssetCacheTelemetryEnabled()) return;
  if (typeof window === "undefined") return;
  window.__GESTIONALE_ASSET_CACHE__ = {
    report: printCacheReport,
    hotspots: printAssetHotspots,
    ratio: getCacheHitRatio,
    ratioByEntity: getCacheHitRatioByEntity,
    latency: getAverageAssetLatency,
    events: getAssetCacheEvents,
    reset: resetAssetCacheTelemetry,
    invalidationHints: getAssetCacheInvalidationHints,
  };
}

export function AssetCacheDebugMount() {
  useEffect(() => {
    mountAssetCacheDebug();
  }, []);
  return null;
}
