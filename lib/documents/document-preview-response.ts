import { MEDIA_CACHE_IMMUTABLE } from "@/lib/decision/request-decision-registry";

export function documentPreviewResponseHeaders(opts: {
  cacheStatus: "HIT" | "MISS";
  generateMs: number;
}): Record<string, string> {
  return {
    "Content-Type": "image/webp",
    "Cache-Control": MEDIA_CACHE_IMMUTABLE,
    "X-Preview-Status": opts.cacheStatus,
    "X-Preview-Generate-Ms": String(opts.generateMs),
    "X-Content-Type-Options": "nosniff",
  };
}
