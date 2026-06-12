import { buildRequestContextFromUrl } from "@/lib/decision/request-context";
import {
  cacheControlForTier,
  classifyMediaCacheTier,
  getCachePolicy,
  type CacheTier,
} from "@/lib/decision/request-decision-registry";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";

export type EdgeCachePolicy = CacheTier;

export { MEDIA_CACHE_IMMUTABLE, MEDIA_CACHE_SHORT } from "@/lib/decision/request-decision-registry";

export type MediaPathValidationResult =
  | { ok: true; normalizedPath: string; cachePolicy: EdgeCachePolicy; cacheControl: string }
  | { ok: false; error: string };

export function classifyMediaCachePolicy(normalizedPath: string): EdgeCachePolicy {
  return classifyMediaCacheTier(normalizedPath);
}

export function cacheControlForPolicy(policy: EdgeCachePolicy): string {
  return cacheControlForTier(policy);
}

export function validateMediaImagePath(
  rawPath: string | null | undefined,
  runtimeSource: "edge" | "server" = "edge",
): MediaPathValidationResult {
  const objectPath = rawPath?.trim() ?? "";
  if (!objectPath) return { ok: false, error: "path required" };

  const normalized = normalizeStorageObjectPath(objectPath);
  if (!normalized || normalized.includes("..")) {
    return { ok: false, error: "invalid path" };
  }

  const ctx = buildRequestContextFromUrl(
    `/api/media/image?path=${encodeURIComponent(objectPath)}`,
    "GET",
    runtimeSource,
    { flags: { normalizedStoragePath: normalized } },
  );
  ctx.query.path = objectPath;
  ctx.flags = { ...ctx.flags, normalizedStoragePath: normalized };

  const cache = getCachePolicy(ctx);
  const tier = cache.tier;

  return {
    ok: true,
    normalizedPath: normalized,
    cachePolicy: tier,
    cacheControl: cache.cacheControl,
  };
}
