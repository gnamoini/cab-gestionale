import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LabelPayload, LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import { GENERATOR_VERSION } from "@/lib/inventory-labels/domain/types";
import { computeLabelFingerprint } from "@/lib/inventory-labels/domain/fingerprints";
import {
  downloadLabelArtifact,
  getLabelArtifactByHash,
  uploadLabelArtifactBestEffort,
} from "@/lib/inventory-labels/storage/artifacts.server";
import { renderLabelPng } from "@/lib/inventory-labels/render/png";
import { assembleMultiLabelPdf } from "@/lib/inventory-labels/render/pdf-pipeline";

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
};

async function resolveLabelPngBytes(
  sb: SupabaseClient,
  template: LabelTemplateDefinition,
  item: BulkLabelItem,
  preset: string,
  includeBarcode: boolean,
  stats: BulkAssemblyStats,
): Promise<Buffer> {
  const hash = computeLabelFingerprint({
    payload: item.payload,
    templateId: template.id,
    templateVersion: template.version,
    generatorVersion: GENERATOR_VERSION,
    preset,
    includeBarcode,
    canonicalOrigin: item.canonicalOrigin.replace(/\/+$/, ""),
  });

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
  const png = await renderLabelPng(template, item.payload, item.qrUrl, { includeBarcode });
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

/** IL-002: per-label PNG cache before PDF assembly. */
export async function renderBulkLabelPdfWithCache(
  sb: SupabaseClient,
  template: LabelTemplateDefinition,
  items: BulkLabelItem[],
  preset: string,
  options?: {
    includeBarcode?: boolean;
    onProgress?: (done: number, total: number) => void | Promise<void>;
    onChunkHeartbeat?: () => void | Promise<void>;
    chunkSize?: number;
  },
): Promise<
  import("@/lib/inventory-labels/render/pdf-pipeline").BulkPdfRenderResult & BulkAssemblyStats
> {
  const stats: BulkAssemblyStats = { cacheHitCount: 0, cacheMissCount: 0 };
  const chunkSize = options?.chunkSize ?? 25;
  const includeBarcode = options?.includeBarcode === true;
  const pngs: Buffer[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    pngs.push(await resolveLabelPngBytes(sb, template, item, preset, includeBarcode, stats));
    if ((i + 1) % chunkSize === 0) await options?.onChunkHeartbeat?.();
    await options?.onProgress?.(i + 1, items.length);
  }

  const pipelineItems = items.map((it) => ({ payload: it.payload, qrUrl: it.qrUrl }));
  const bytes = assembleMultiLabelPdf(template, pipelineItems, pngs);
  return {
    kind: "pdf",
    bytes,
    pipeline: "primary",
    peakHeapMb: 0,
    ...stats,
  };
}
