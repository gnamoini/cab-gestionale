import type { RequestContext } from "@/lib/decision/request-context";
import { BRANDING_LOGO_STORAGE_PREFIX } from "@/src/lib/storage/storage-paths";

export const TTL_IMMUTABLE = 31536000;
export const TTL_SHORT = 3600;

export const MEDIA_CACHE_IMMUTABLE = "public, max-age=31536000, immutable";
export const MEDIA_CACHE_SHORT = "public, max-age=3600";
export const MEDIA_CACHE_PRIVATE = "private, no-store";

export const NON_EDGE_PREFIXES = [
  "/api/pdf/",
  "/api/cache/",
  "/api/preventivi/",
  "/api/branding/",
] as const;

export type RouteClassification =
  | "document_delivery"
  | "document_preview"
  | "media_image"
  | "upload_policy"
  | "non_edge"
  | "unknown";

export type AssetDeliveryStrategy = "thumbnail" | "full_file" | "download" | "transcoded_image" | "none";

export type AuthPrecheckStrategy = "reject_expired" | "defer_to_auth" | "not_applicable";

export type CacheTier = "immutable" | "short";

export type DecisionPolicy = {
  cacheable: boolean;
  ttl: number;
  edgeEligible: boolean;
  requiresAuth: boolean;
  fallbackRoute: string | null;
};

export type CachePolicyDecision = DecisionPolicy & {
  tier: CacheTier;
  cacheControl: string;
};

export type RouteClassificationDecision = DecisionPolicy & {
  classification: RouteClassification;
};

export type AssetDeliveryDecision = DecisionPolicy & {
  strategy: AssetDeliveryStrategy;
};

export type AuthPrecheckDecision = {
  strategy: AuthPrecheckStrategy;
  requiresAuth: boolean;
};

function isNonEdgePath(pathname: string): boolean {
  return NON_EDGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function classifyRoute(pathname: string, method: string): RouteClassification {
  if (!pathname.startsWith("/api/")) return "unknown";
  if (isNonEdgePath(pathname)) return "non_edge";
  if (method === "POST" && pathname === "/api/documents/upload-policy") return "upload_policy";
  if (method === "GET" && pathname === "/api/media/image") return "media_image";
  if (method === "GET" && pathname.endsWith("/preview") && /^\/api\/documents\/[^/]+\/preview$/.test(pathname)) {
    return "document_preview";
  }
  if (method === "GET" && /^\/api\/documents\/[^/]+$/.test(pathname)) return "document_delivery";
  return "unknown";
}

export function classifyMediaCacheTier(normalizedPath: string): CacheTier {
  if (normalizedPath.startsWith(BRANDING_LOGO_STORAGE_PREFIX)) return "immutable";
  if (/\d{10,}-/.test(normalizedPath.split("/").pop() ?? "")) return "immutable";
  return "short";
}

export function cacheControlForTier(tier: CacheTier): string {
  return tier === "immutable" ? MEDIA_CACHE_IMMUTABLE : MEDIA_CACHE_PRIVATE;
}

export function ttlForTier(tier: CacheTier): number {
  return tier === "immutable" ? TTL_IMMUTABLE : TTL_SHORT;
}

export function shouldBypassCache(ctx: RequestContext): boolean {
  if (ctx.operationType === "upload" || ctx.operationType === "write") return true;
  if (ctx.operationType === "download") return true;
  if (ctx.route === "/api/documents/upload-policy") return true;
  return false;
}

export function getRouteClassification(ctx: RequestContext): RouteClassificationDecision {
  const classification = classifyRoute(ctx.route, ctx.method);
  const edgeEligible =
    classification !== "non_edge" &&
    classification !== "unknown" &&
    (classification === "document_delivery" ||
      classification === "document_preview" ||
      classification === "media_image" ||
      classification === "upload_policy");

  return {
    classification,
    cacheable: classification === "media_image" || classification.startsWith("document"),
    ttl: classification === "media_image" ? TTL_SHORT : TTL_SHORT,
    edgeEligible,
    requiresAuth: ctx.route.startsWith("/api/"),
    fallbackRoute: edgeEligible ? null : ctx.route,
  };
}

export function getCachePolicy(ctx: RequestContext): CachePolicyDecision {
  const bypass = shouldBypassCache(ctx);
  const routeClass = getRouteClassification(ctx);

  if (bypass || routeClass.classification === "upload_policy") {
    return {
      cacheable: false,
      ttl: 0,
      tier: "short",
      cacheControl: "no-store",
      edgeEligible: routeClass.edgeEligible,
      requiresAuth: true,
      fallbackRoute: null,
    };
  }

  if (routeClass.classification === "media_image") {
    const normalized = ctx.flags?.normalizedStoragePath ?? ctx.query.path ?? "";
    const tier = normalized ? classifyMediaCacheTier(normalized) : "short";
    return {
      cacheable: true,
      ttl: ttlForTier(tier),
      tier,
      cacheControl: cacheControlForTier(tier),
      edgeEligible: true,
      requiresAuth: true,
      fallbackRoute: null,
    };
  }

  if (
    routeClass.classification === "document_delivery" ||
    routeClass.classification === "document_preview"
  ) {
    const tier: CacheTier = ctx.query.v ? "short" : "short";
    return {
      cacheable: true,
      ttl: ttlForTier(tier),
      tier,
      cacheControl: cacheControlForTier(tier),
      edgeEligible: true,
      requiresAuth: true,
      fallbackRoute: null,
    };
  }

  return {
    cacheable: false,
    ttl: 0,
    tier: "short",
    cacheControl: "no-store",
    edgeEligible: false,
    requiresAuth: ctx.route.startsWith("/api/"),
    fallbackRoute: null,
  };
}

export function getAssetDeliveryStrategy(ctx: RequestContext): AssetDeliveryDecision {
  const routeClass = getRouteClassification(ctx);

  if (routeClass.classification === "media_image") {
    return {
      strategy: "transcoded_image",
      cacheable: true,
      ttl: TTL_SHORT,
      edgeEligible: true,
      requiresAuth: true,
      fallbackRoute: null,
    };
  }

  if (routeClass.classification === "upload_policy") {
    return {
      strategy: "none",
      cacheable: false,
      ttl: 0,
      edgeEligible: true,
      requiresAuth: true,
      fallbackRoute: null,
    };
  }

  if (
    routeClass.classification !== "document_delivery" &&
    routeClass.classification !== "document_preview"
  ) {
    return {
      strategy: "none",
      cacheable: false,
      ttl: 0,
      edgeEligible: routeClass.edgeEligible,
      requiresAuth: ctx.route.startsWith("/api/"),
      fallbackRoute: null,
    };
  }

  const mode = ctx.query.mode;
  const isPreviewPath = ctx.flags?.isPreviewPath ?? ctx.route.endsWith("/preview");

  let strategy: AssetDeliveryStrategy = "full_file";
  if (mode === "download") strategy = "download";
  else if (isPreviewPath) strategy = "thumbnail";
  else if (mode === "preview" || !mode) {
    const accept = ctx.headers.accept?.toLowerCase() ?? "";
    strategy = accept.includes("image/") ? "thumbnail" : "full_file";
  }

  const fallbackRoute =
    strategy === "thumbnail" && !isPreviewPath && ctx.entityId
      ? `/api/documents/${ctx.entityId}/preview`
      : null;

  return {
    strategy,
    cacheable: true,
    ttl: TTL_SHORT,
    edgeEligible: true,
    requiresAuth: true,
    fallbackRoute,
  };
}

export function getAuthPrecheckStrategy(ctx: RequestContext): AuthPrecheckDecision {
  if (!ctx.route.startsWith("/api/") || isNonEdgePath(ctx.route)) {
    return { strategy: "not_applicable", requiresAuth: false };
  }

  return { strategy: "defer_to_auth", requiresAuth: true };
}

/** Re-export for backward compatibility with edge validators. */
export function classifyDocumentDeliveryRoute(input: {
  isPreviewPath: boolean;
  mode: string;
  acceptHeader: string | null;
}): AssetDeliveryStrategy {
  const ctx = buildSyntheticDocumentContext(input);
  return getAssetDeliveryStrategy(ctx).strategy;
}

function buildSyntheticDocumentContext(input: {
  isPreviewPath: boolean;
  mode: string;
  acceptHeader: string | null;
}): RequestContext {
  return {
    route: input.isPreviewPath ? "/api/documents/x/preview" : "/api/documents/x",
    method: "GET",
    operationType: input.mode === "download" ? "download" : "read",
    runtimeSource: "edge",
    query: { mode: input.mode === "download" ? "download" : "preview" },
    headers: { accept: input.acceptHeader ?? undefined },
    flags: { isPreviewPath: input.isPreviewPath },
  };
}

export function classifyMediaCachePolicy(normalizedPath: string): CacheTier {
  return classifyMediaCacheTier(normalizedPath);
}
