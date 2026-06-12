"use client";

import { resolveEntityCacheVersion } from "@/lib/cache/minimal-invalidation-contract";
import type { MicEntityType } from "@/lib/cache/mic-types";
import type { DocumentDeliverySource } from "@/lib/documents/document-delivery-types";
import type { LavorazioneDocumentTipo } from "@/src/types/supabase-tables";

export type BuildDocumentPreviewUrlParams = {
  source?: DocumentDeliverySource;
  tipo?: LavorazioneDocumentTipo;
  v?: string;
  /** MIC entity for client version bump merge (defaults by source). */
  entityType?: MicEntityType;
  entityId?: string;
};

function defaultPreviewEntity(
  id: string,
  source: DocumentDeliverySource,
): { entityType: MicEntityType; entityId: string } {
  return source === "lavorazione"
    ? { entityType: "lavorazione", entityId: id }
    : { entityType: "documento", entityId: id };
}

export function buildDocumentPreviewUrl(id: string, params?: BuildDocumentPreviewUrlParams): string {
  const source = params?.source ?? "archive";
  const entity = params?.entityType && params?.entityId
    ? { entityType: params.entityType, entityId: params.entityId }
    : defaultPreviewEntity(id, source);
  const cacheVersion = resolveEntityCacheVersion(entity.entityType, entity.entityId, params?.v);

  const search = new URLSearchParams();
  search.set("source", source);
  if (params?.tipo) search.set("tipo", params.tipo);
  if (cacheVersion) search.set("v", cacheVersion);
  return `/api/documents/${encodeURIComponent(id)}/preview?${search.toString()}`;
}
