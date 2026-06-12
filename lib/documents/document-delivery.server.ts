import "server-only";

import { documentDeliveryResponseHeaders } from "@/lib/documents/document-delivery-response";
import { getCachedDocumentoBytes } from "@/lib/documents/document-delivery-storage.server";
import type { DocumentDeliveryMode, DocumentDeliverySource } from "@/lib/documents/document-delivery-types";
import { resolveDocumentFileServer } from "@/lib/documents/document-fetch-server";
import { recordAssetCacheAccess } from "@/lib/observability/asset-cache-telemetry.server";
import type { LavorazioneDocumentTipo } from "@/src/types/supabase-tables";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export type DocumentDeliveryResult = {
  bytes: Uint8Array;
  headers: Record<string, string>;
};

export async function deliverDocumentFile(input: {
  id: string;
  source: DocumentDeliverySource;
  mode: DocumentDeliveryMode;
  tipo?: LavorazioneDocumentTipo;
}): Promise<ServiceResult<DocumentDeliveryResult>> {
  const t0 = performance.now();
  const resolved = await resolveDocumentFileServer({
    id: input.id,
    source: input.source,
    tipo: input.tipo,
  });
  if (!resolved.success || !resolved.data) return err(resolved.error ?? "Documento non trovato");

  const file = resolved.data;
  const bytes = await getCachedDocumentoBytes(file.storagePath);
  if (!bytes) return err("File non trovato nello storage.");

  const headers = documentDeliveryResponseHeaders({
    fileName: file.fileName,
    contentType: file.contentType,
    mode: input.mode,
    source: file.source,
  });

  recordAssetCacheAccess({
    assetType: "document",
    cacheStatus: "HIT",
    entityType: "documento",
    entityId: input.id,
    latencyMs: Math.round(performance.now() - t0),
    source: "storage",
    meta: { deliverySource: input.source, mode: input.mode },
  });

  return success({ bytes, headers });
}
