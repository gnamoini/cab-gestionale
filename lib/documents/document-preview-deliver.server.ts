import "server-only";

import { sha256HexFromBuffer } from "@/lib/documents/document-content-hash.server";
import { getCachedDocumentoBytes } from "@/lib/documents/document-delivery-storage.server";
import type { DocumentDeliverySource } from "@/lib/documents/document-delivery-types";
import { mergeDocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import { documentPreviewResponseHeaders } from "@/lib/documents/document-preview-response";
import { generateDocumentThumbnailBytes } from "@/lib/documents/document-thumbnail-generate.server";
import {
  getCachedDocumentThumbnail,
  uploadDocumentThumbnail,
} from "@/lib/documents/document-thumbnail-storage.server";
import { resolveDocumentFileServer } from "@/lib/documents/document-fetch-server";
import { recordAssetCacheAccess } from "@/lib/observability/asset-cache-telemetry.server";
import { traceRuntimeCoordinationServer } from "@/lib/observability/runtime-coordination-tracer.server";
import { DOCUMENTI_COLUMNS } from "@/lib/db/table-select-columns";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneDocumentTipo } from "@/src/types/supabase-tables";
import type { DocumentoRow } from "@/src/types/supabase-tables";

export type DocumentPreviewDelivery = {
  bytes: Uint8Array;
  headers: Record<string, string>;
};

async function persistArchiveThumbnailMeta(documentId: string, contentHash: string, thumbnailKey: string): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb.from("documenti").select(DOCUMENTI_COLUMNS).eq("id", documentId).maybeSingle();
  if (!data) return;
  const row = data as DocumentoRow;
  const meta = mergeDocumentIntelligenceMeta(row.meta as Record<string, unknown>, {
    contentHash,
    thumbnailKey,
  });
  await sb.from("documenti").update({ meta }).eq("id", documentId);
}

export async function deliverDocumentPreview(input: {
  id: string;
  source: DocumentDeliverySource;
  tipo?: LavorazioneDocumentTipo;
}): Promise<ServiceResult<DocumentPreviewDelivery>> {
  const t0 = performance.now();
  const resolved = await resolveDocumentFileServer({
    id: input.id,
    source: input.source,
    tipo: input.tipo,
  });
  if (!resolved.success || !resolved.data) return err(resolved.error ?? "Documento non trovato");

  const file = resolved.data;
  let contentHash = file.contentHash?.trim();

  let thumbBytes = contentHash ? await getCachedDocumentThumbnail(contentHash) : null;
  let cacheStatus: "HIT" | "MISS" = thumbBytes ? "HIT" : "MISS";
  let telemetryStatus: "HIT" | "MISS" | "REVALIDATED" = cacheStatus;

  if (!thumbBytes) {
    const fileBytes = await getCachedDocumentoBytes(file.storagePath);
    if (!fileBytes) return err("File non trovato nello storage.");

    if (!contentHash) {
      contentHash = sha256HexFromBuffer(fileBytes);
    }

    thumbBytes = await getCachedDocumentThumbnail(contentHash);
    if (thumbBytes) {
      cacheStatus = "HIT";
      telemetryStatus = "REVALIDATED";
    } else {
      const generated = await generateDocumentThumbnailBytes({
        bytes: fileBytes,
        fileName: file.fileName,
        contentType: file.contentType,
      });
      if (!generated) return err("Anteprima non disponibile per questo tipo di file.");

      const thumbnailKey = await uploadDocumentThumbnail(contentHash, generated);
      thumbBytes = generated;
      cacheStatus = "MISS";

      if (input.source === "archive" && file.documentRowId) {
        void persistArchiveThumbnailMeta(file.documentRowId, contentHash, thumbnailKey);
      }
    }
  }

  const generateMs = Math.round(performance.now() - t0);
  const headers = documentPreviewResponseHeaders({ cacheStatus, generateMs });

  traceRuntimeCoordinationServer({
    type: cacheStatus === "HIT" ? "server_cache_hit" : "server_cache_miss",
    entityType: "documento",
    entityId: input.id,
    scope: "document",
    layer: "document-preview",
    meta: { generateMs, source: input.source },
  });
  if (cacheStatus === "MISS") {
    traceRuntimeCoordinationServer({
      type: "asset_regenerated",
      entityType: "documento",
      entityId: input.id,
      scope: "document",
      layer: "document-preview",
      meta: { generateMs },
    });
  }

  recordAssetCacheAccess({
    assetType: "thumbnail",
    cacheStatus: telemetryStatus,
    entityType: "documento",
    entityId: input.id,
    latencyMs: generateMs,
    source: telemetryStatus === "MISS" ? "generated" : "storage",
    meta: { contentHash, source: input.source },
  });

  return success({ bytes: thumbBytes, headers });
}
