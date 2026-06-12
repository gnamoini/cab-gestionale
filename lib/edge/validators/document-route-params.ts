import type { DocumentDeliveryMode, DocumentDeliverySource } from "@/lib/documents/document-delivery-types";
import { buildRequestContextFromUrl } from "@/lib/decision/request-context";
import {
  getAssetDeliveryStrategy,
  getRouteClassification,
  type AssetDeliveryStrategy,
} from "@/lib/decision/request-decision-registry";
import type { LavorazioneDocumentTipo } from "@/src/types/supabase-tables";

const LAVORAZIONE_TIPI = new Set<LavorazioneDocumentTipo>(["preventivo_upload", "ddt"]);

export type EdgeDeliveryRoute = AssetDeliveryStrategy;

export function parseDocumentSource(raw: string | null): DocumentDeliverySource {
  return raw === "lavorazione" ? "lavorazione" : "archive";
}

export function parseDocumentTipo(raw: string | null): LavorazioneDocumentTipo | undefined {
  if (!raw) return undefined;
  return LAVORAZIONE_TIPI.has(raw as LavorazioneDocumentTipo) ? (raw as LavorazioneDocumentTipo) : undefined;
}

export function parseDocumentMode(raw: string | null): DocumentDeliveryMode {
  return raw === "download" ? "download" : "preview";
}

export type DocumentRouteParams = {
  docId: string;
  source: DocumentDeliverySource;
  mode: DocumentDeliveryMode;
  tipo?: LavorazioneDocumentTipo;
  isPreviewPath: boolean;
};

export type DocumentRouteValidationResult =
  | { ok: true; params: DocumentRouteParams; deliveryRoute: EdgeDeliveryRoute; routeClass: string }
  | { ok: false; error: string };

export function validateDocumentRouteParams(input: {
  docId: string | null | undefined;
  pathname: string;
  searchParams: URLSearchParams;
  acceptHeader: string | null;
  runtimeSource?: "edge" | "server";
}): DocumentRouteValidationResult {
  const docId = input.docId?.trim() ?? "";
  if (!docId) return { ok: false, error: "Id documento mancante" };

  const source = parseDocumentSource(input.searchParams.get("source"));
  const mode = parseDocumentMode(input.searchParams.get("mode"));
  const tipo = parseDocumentTipo(input.searchParams.get("tipo"));
  const isPreviewPath = input.pathname.endsWith("/preview");

  if (source === "lavorazione" && !tipo) {
    return { ok: false, error: "Parametro tipo mancante" };
  }

  const url = `${input.pathname}?${input.searchParams.toString()}`;
  const ctx = buildRequestContextFromUrl(url, "GET", input.runtimeSource ?? "edge", {
    flags: { isPreviewPath },
  });
  ctx.entityId = docId;
  ctx.entityType = source === "lavorazione" ? "lavorazione" : "documento";
  ctx.query = {
    source,
    mode,
    tipo,
  };
  ctx.headers.accept = input.acceptHeader ?? undefined;

  const delivery = getAssetDeliveryStrategy(ctx);
  const routeClass = getRouteClassification(ctx);

  return {
    ok: true,
    params: { docId, source, mode, tipo, isPreviewPath },
    deliveryRoute: delivery.strategy,
    routeClass: routeClass.classification,
  };
}

export { classifyDocumentDeliveryRoute } from "@/lib/decision/request-decision-registry";
