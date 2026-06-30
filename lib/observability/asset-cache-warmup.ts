"use client";

import { buildDocumentPreviewUrl } from "@/lib/documents/document-preview-url";
import { isAssetCacheWarmupEnabled } from "@/lib/observability/config";
import type { AssetCacheAccessInput } from "@/lib/observability/asset-cache-telemetry";
import { buildPdfArtifactUrl } from "@/lib/pdf/request-pdf-artifact";
import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { useEffect, useRef } from "react";

const WARMUP_DEBOUNCE_MS = 2000;
const WARMUP_COOLDOWN_MS = 60_000;
const MAX_CONCURRENT_WARMUPS = 3;

const invalidationHints: Array<{
  entityType: string;
  entityId: string;
  scope?: string;
  invalidatedAt: number;
  correlationId?: string;
  pdfScopes?: number;
}> = [];

const warmedAt = new Map<string, number>();
const pendingDebounce = new Map<string, ReturnType<typeof setTimeout>>();
let activeWarmups = 0;

function warmupKey(url: string): string {
  return url;
}

function canWarm(key: string): boolean {
  if (!isAssetCacheWarmupEnabled()) return false;
  const last = warmedAt.get(key);
  if (last != null && Date.now() - last < WARMUP_COOLDOWN_MS) return false;
  return activeWarmups < MAX_CONCURRENT_WARMUPS;
}

function runWarmupFetch(url: string): void {
  if (!canWarm(url)) return;
  const key = warmupKey(url);
  activeWarmups += 1;
  warmedAt.set(key, Date.now());
  void fetch(url, { credentials: "include", cache: "no-store" })
    .catch(() => {})
    .finally(() => {
      activeWarmups = Math.max(0, activeWarmups - 1);
    });
}

export function noteAssetCacheInvalidation(input: {
  entityType: string;
  entityId: string;
  scope?: string;
  correlationId?: string;
  pdfScopes?: number;
}): void {
  if (!isAssetCacheWarmupEnabled()) return;
  invalidationHints.push({ ...input, invalidatedAt: Date.now() });
  if (invalidationHints.length > 50) invalidationHints.shift();

  if (input.entityType === "report" || input.entityType === "settings") {
    schedulePdfWarmup("report-bundle");
  }
  if (input.entityType === "lavorazione" || input.entityType === "lavorazioni") {
    schedulePdfWarmup("lavorazioni-in-corso");
  }
}

export function getAssetCacheInvalidationHints(): ReadonlyArray<(typeof invalidationHints)[number]> {
  return invalidationHints;
}

function schedulePdfWarmup(type: PdfArtifactType): void {
  const url = buildPdfArtifactUrl(type);
  scheduleWarmupUrl(url);
}

export function scheduleWarmupUrl(url: string): void {
  if (!isAssetCacheWarmupEnabled()) return;
  const key = warmupKey(url);
  const existing = pendingDebounce.get(key);
  if (existing) clearTimeout(existing);
  pendingDebounce.set(
    key,
    setTimeout(() => {
      pendingDebounce.delete(key);
      runWarmupFetch(url);
    }, WARMUP_DEBOUNCE_MS),
  );
}

export function warmupPdfArtifact(type: PdfArtifactType): void {
  schedulePdfWarmup(type);
}

export function warmupDocumentPreview(
  id: string,
  params?: Parameters<typeof buildDocumentPreviewUrl>[1],
): void {
  if (!isAssetCacheWarmupEnabled()) return;
  scheduleWarmupUrl(buildDocumentPreviewUrl(id, params));
}

export function onAssetCacheMiss(input: AssetCacheAccessInput): void {
  if (!isAssetCacheWarmupEnabled() || input.cacheStatus !== "MISS") return;

  if (input.assetType === "pdf" && input.meta?.pdfType) {
    schedulePdfWarmup(String(input.meta.pdfType) as PdfArtifactType);
    return;
  }
  if (input.assetType === "thumbnail" && input.entityId) {
    warmupDocumentPreview(input.entityId, {
      source: input.meta?.source as "archive" | "lavorazione" | undefined,
    });
  }
}

/** Dev: warm recurring report PDF after page mount. */
export function useReportPdfWarmup(): void {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    schedulePdfWarmup("report-bundle");
  }, []);
}

/** Dev: warm lavorazioni-in-corso PDF after list mount. */
export function useLavorazioniPdfWarmup(): void {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    schedulePdfWarmup("lavorazioni-in-corso");
  }, []);
}
