import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LabelPayload, LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import { GENERATOR_VERSION } from "@/lib/inventory-labels/domain/types";
import { computeLabelFingerprint } from "@/lib/inventory-labels/domain/fingerprints";
import {
  uniqueBulkEntityIds,
  type BulkLabelCompactItem,
} from "@/lib/inventory-labels/domain/bulk-items";
import {
  downloadLabelArtifact,
  getLabelArtifactByHash,
  uploadLabelArtifactBestEffort,
} from "@/lib/inventory-labels/storage/artifacts.server";
import { renderLabelPng } from "@/lib/inventory-labels/render/png";
import { assembleMultiLabelPdf, type LabelPdfSlot } from "@/lib/inventory-labels/render/pdf-pipeline";

export type BulkLabelItem = {
  entityId: string;
  entityType: string;
  payload: LabelPayload;
  qrUrl: string;
  canonicalOrigin: string;
};

export type BulkAssemblyStats = {
  cacheHitCount: number;
  cacheMissCount: number;
  uniqueRenderCount: number;
};

function qrTokenFromInventoryUrl(qrUrl: string): string {
  const m = /\/r\/([^/?#]+)/.exec(qrUrl);
  return m?.[1]?.trim() ?? "";
}

function fingerprintForItem(
  item: BulkLabelItem,
  template: LabelTemplateDefinition,
  preset: string,
  clienteLabel: boolean,
): string {
  return computeLabelFingerprint({
    payload: item.payload,
    templateId: template.id,
    templateVersion: template.version,
    generatorVersion: GENERATOR_VERSION,
    preset,
    labelKind: clienteLabel ? "cliente" : "internal",
    clienteQrUrl: clienteLabel ? item.qrUrl : "",
    qrToken: clienteLabel ? undefined : qrTokenFromInventoryUrl(item.qrUrl),
    canonicalOrigin: item.canonicalOrigin.replace(/\/+$/, ""),
  });
}

async function resolveLabelPngBytes(
  sb: SupabaseClient,
  template: LabelTemplateDefinition,
  item: BulkLabelItem,
  preset: string,
  clienteLabel: boolean,
  stats: BulkAssemblyStats,
): Promise<Buffer> {
  const hash = fingerprintForItem(item, template, preset, clienteLabel);

  const cached = await getLabelArtifactByHash(sb, {
    entityType: item.entityType,
    entityId: item.entityId,
    hash,
    format: "png",
  });

  if (cached) {
    const bytes = await downloadLabelArtifact(cached.storage_path);
    if (bytes) {
      stats.cacheHitCount += 1;
      return Buffer.from(bytes);
    }
  }

  stats.cacheMissCount += 1;
  const png = await renderLabelPng(template, item.payload, item.qrUrl, {
    labelKind: clienteLabel ? "cliente" : "internal",
  });
  const storagePath = await uploadLabelArtifactBestEffort({
    entityType: item.entityType,
    entityId: item.entityId,
    hash,
    format: "png",
    bytes: new Uint8Array(png),
  });
  if (storagePath) {
    await sb.from("inventory_label_artifacts").upsert(
      {
        entity_type: item.entityType,
        entity_id: item.entityId,
        hash,
        format: "png",
        preset,
        template_id: template.id,
        storage_path: storagePath,
        generator_version: GENERATOR_VERSION,
        template_version: template.version,
      },
      { onConflict: "entity_type,entity_id,hash,format", ignoreDuplicates: true },
    );
  }
  return png;
}

export function buildExpandedPdfSlots(
  compact: readonly BulkLabelCompactItem[],
  uniqueItems: readonly BulkLabelItem[],
  template: LabelTemplateDefinition,
  preset: string,
  clienteLabel: boolean,
): LabelPdfSlot[] {
  const byId = new Map(uniqueItems.map((item) => [item.entityId, item]));
  const expanded: BulkLabelItem[] = [];
  for (const item of compact) {
    const resolved = byId.get(item.id);
    if (!resolved) continue;
    for (let i = 0; i < item.quantity; i++) expanded.push(resolved);
  }
  return expanded.map((item) => ({
    payload: item.payload,
    qrUrl: item.qrUrl,
    cacheKey: fingerprintForItem(item, template, preset, clienteLabel),
  }));
}

/** IL-002: per-label PNG cache before PDF assembly with quantity expansion. */
export async function renderBulkLabelPdfWithCache(
  sb: SupabaseClient,
  template: LabelTemplateDefinition,
  compact: BulkLabelCompactItem[],
  uniqueItems: BulkLabelItem[],
  preset: string,
  options?: {
    clienteLabel?: boolean;
    onProgress?: (done: number, total: number) => void | Promise<void>;
    onChunkHeartbeat?: () => void | Promise<void>;
    chunkSize?: number;
  },
): Promise<
  import("@/lib/inventory-labels/render/pdf-pipeline").BulkPdfRenderResult & BulkAssemblyStats
> {
  const stats: BulkAssemblyStats = { cacheHitCount: 0, cacheMissCount: 0, uniqueRenderCount: 0 };
  const chunkSize = options?.chunkSize ?? 25;
  const clienteLabel = options?.clienteLabel === true;
  const slots = buildExpandedPdfSlots(compact, uniqueItems, template, preset, clienteLabel);

  const pngByCacheKey = new Map<string, Buffer>();
  for (let i = 0; i < uniqueItems.length; i++) {
    const item = uniqueItems[i]!;
    const cacheKey = fingerprintForItem(item, template, preset, clienteLabel);
    if (pngByCacheKey.has(cacheKey)) continue;
    pngByCacheKey.set(
      cacheKey,
      await resolveLabelPngBytes(sb, template, item, preset, clienteLabel, stats),
    );
    stats.uniqueRenderCount += 1;
    if ((i + 1) % chunkSize === 0) await options?.onChunkHeartbeat?.();
    await options?.onProgress?.(i + 1, uniqueItems.length);
  }

  const pngs = slots.map((slot) => pngByCacheKey.get(slot.cacheKey!)!);
  const bytes = assembleMultiLabelPdf(template, slots, pngs);
  return {
    kind: "pdf",
    bytes,
    pipeline: "primary",
    peakHeapMb: 0,
    ...stats,
  };
}

export { uniqueBulkEntityIds };
