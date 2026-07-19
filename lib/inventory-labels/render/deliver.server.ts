import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LabelFormat, LabelPayload } from "@/lib/inventory-labels/domain/types";
import { GENERATOR_VERSION } from "@/lib/inventory-labels/domain/types";
import { computeLabelFingerprint } from "@/lib/inventory-labels/domain/fingerprints";
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { buildInventoryQrUrl } from "@/lib/inventory-labels/domain/tokens";
import { renderLabelPng } from "@/lib/inventory-labels/render/png";
import { renderSingleLabelPdf } from "@/lib/inventory-labels/render/pdf";
import { renderLabelSvg } from "@/lib/inventory-labels/render/svg";
import {
  downloadLabelArtifact,
  getLabelArtifactByHash,
  uploadLabelArtifactBestEffort,
} from "@/lib/inventory-labels/storage/artifacts.server";
import { writeInventoryLabelEvent } from "@/lib/inventory-labels/audit/events.server";
import { buildLabelPdfMetricsPayload } from "@/lib/inventory-labels/observability/label-pdf-metrics.server";
import { renderDedupKey, withRenderDedup } from "@/lib/inventory-labels/render/render-dedup";

export type DeliverLabelInput = {
  sb: SupabaseClient;
  entityType: string;
  entityId: string;
  payload: LabelPayload;
  token: string;
  preset: string;
  format: LabelFormat;
  origin: string;
  includeBarcode?: boolean;
  userId?: string | null;
  device?: string | null;
};

export type DeliverLabelResult = {
  bytes: Uint8Array;
  cacheStatus: "HIT" | "MISS";
  hash: string;
  fileName: string;
  contentType: string;
};

function contentTypeFor(format: LabelFormat): string {
  if (format === "png") return "image/png";
  if (format === "svg") return "image/svg+xml";
  return "application/pdf";
}

function fileNameFor(entityId: string, codice: string, format: LabelFormat): string {
  const safe = codice.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || entityId.slice(0, 8);
  return `etichetta-${safe}.${format}`;
}

export async function deliverInventoryLabel(input: DeliverLabelInput): Promise<DeliverLabelResult> {
  const template = getLabelTemplate(input.preset);
  if (!template) throw new Error("Template etichetta non valido");

  const includeBarcode = input.includeBarcode !== false;
  const hash = computeLabelFingerprint({
    payload: input.payload,
    templateId: template.id,
    templateVersion: template.version,
    generatorVersion: GENERATOR_VERSION,
    preset: input.preset,
    includeBarcode,
  });

  const cached = await getLabelArtifactByHash(input.sb, {
    entityType: input.entityType,
    entityId: input.entityId,
    hash,
    format: input.format,
  });

  if (cached) {
    const bytes = await downloadLabelArtifact(cached.storage_path);
    if (bytes) {
      return {
        bytes,
        cacheStatus: "HIT",
        hash,
        fileName: fileNameFor(input.entityId, input.payload.codice, input.format),
        contentType: contentTypeFor(input.format),
      };
    }
  }

  const qrUrl = buildInventoryQrUrl(input.token, input.origin);
  const renderOptions = { includeBarcode };
  const dedupKey = renderDedupKey(input.entityId, hash, input.format);
  let buffer: Buffer;
  if (input.format === "png") {
    buffer = await withRenderDedup(dedupKey, () =>
      renderLabelPng(template, input.payload, qrUrl, renderOptions),
    );
  } else if (input.format === "svg") {
    buffer = await withRenderDedup(dedupKey, async () => {
      const svg = await renderLabelSvg(template, input.payload, qrUrl, renderOptions);
      return Buffer.from(svg, "utf8");
    });
  } else {
    buffer = await withRenderDedup(dedupKey, async () => {
      const pdf = await renderSingleLabelPdf(template, input.payload, qrUrl, renderOptions);
      return Buffer.from(pdf);
    });
  }

  const storagePath = await uploadLabelArtifactBestEffort({
    entityType: input.entityType,
    entityId: input.entityId,
    hash,
    format: input.format,
    bytes: new Uint8Array(buffer),
  });

  if (storagePath) {
    await input.sb.from("inventory_label_artifacts").upsert(
      {
        entity_type: input.entityType,
        entity_id: input.entityId,
        hash,
        format: input.format,
        preset: input.preset,
        template_id: template.id,
        storage_path: storagePath,
        generator_version: GENERATOR_VERSION,
        template_version: template.version,
      },
      { onConflict: "entity_type,entity_id,hash,format", ignoreDuplicates: true },
    );
  }

  const downloadEvent =
    input.format === "png" ? "DOWNLOAD_PNG" : input.format === "svg" ? "DOWNLOAD_SVG" : "DOWNLOAD_PDF";

  await writeInventoryLabelEvent(input.sb, {
    eventType: "LABEL_GENERATED",
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId,
    device: input.device,
    payload: buildLabelPdfMetricsPayload({
      labelCount: 1,
      cacheHitCount: 0,
      cacheMissCount: 1,
      durationMs: 0,
      outcome: "ok",
    }),
  });

  await writeInventoryLabelEvent(input.sb, {
    eventType: downloadEvent,
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId,
    device: input.device,
    payload: { preset: input.preset, hash },
  });

  return {
    bytes: new Uint8Array(buffer),
    cacheStatus: "MISS",
    hash,
    fileName: fileNameFor(input.entityId, input.payload.codice, input.format),
    contentType: contentTypeFor(input.format),
  };
}
