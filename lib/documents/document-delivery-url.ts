"use client";

import { buildRequestContextFromClientPath } from "@/lib/decision/request-context";
import { getAssetDeliveryStrategy } from "@/lib/decision/request-decision-registry";
import { resolveEntityCacheVersion } from "@/lib/cache/minimal-invalidation-contract";
import type { DocumentDeliveryMode, DocumentDeliverySource } from "@/lib/documents/document-delivery-types";
import type { LavorazioneDocumentTipo } from "@/src/types/supabase-tables";

export type BuildDocumentDeliveryUrlParams = {
  source?: DocumentDeliverySource;
  mode?: DocumentDeliveryMode;
  tipo?: LavorazioneDocumentTipo;
  /** Cache-buster when storage path is overwritten in-place (lavorazione slots). */
  v?: string;
};

/** RDR-aligned delivery strategy for client URL construction (pure, no fetch). */
export function resolveClientDocumentDeliveryStrategy(
  id: string,
  params?: BuildDocumentDeliveryUrlParams,
): ReturnType<typeof getAssetDeliveryStrategy>["strategy"] {
  const ctx = buildRequestContextFromClientPath(`/api/documents/${encodeURIComponent(id)}`, {
    source: params?.source ?? "archive",
    mode: params?.mode ?? "preview",
    tipo: params?.tipo,
  });
  ctx.entityId = id;
  return getAssetDeliveryStrategy(ctx).strategy;
}

export function buildDocumentDeliveryUrl(id: string, params?: BuildDocumentDeliveryUrlParams): string {
  const source = params?.source ?? "archive";
  const entityType = source === "lavorazione" ? "lavorazione" : "documento";
  const cacheVersion = resolveEntityCacheVersion(entityType, id, params?.v);

  const search = new URLSearchParams();
  search.set("source", source);
  if (params?.mode && params.mode !== "preview") search.set("mode", params.mode);
  if (params?.tipo) search.set("tipo", params.tipo);
  if (cacheVersion) search.set("v", cacheVersion);
  const qs = search.toString();
  return qs ? `/api/documents/${encodeURIComponent(id)}?${qs}` : `/api/documents/${encodeURIComponent(id)}`;
}

export function archiveDocumentDeliveryUrl(
  documentoId: string,
  mode: DocumentDeliveryMode = "preview",
  contentVersion?: string,
): string {
  const v = resolveEntityCacheVersion("documento", documentoId, contentVersion);
  return buildDocumentDeliveryUrl(documentoId, { source: "archive", mode, v });
}

export function lavorazioneDocumentDeliveryUrl(
  doc: { lavorazione_id: string; tipo: LavorazioneDocumentTipo; uploaded_at: string },
  mode: DocumentDeliveryMode = "preview",
): string {
  return buildDocumentDeliveryUrl(doc.lavorazione_id, {
    source: "lavorazione",
    tipo: doc.tipo,
    mode,
    v: doc.uploaded_at,
  });
}
