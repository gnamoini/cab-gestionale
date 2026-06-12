export function documentPreviewResponseHeaders(opts: {
  cacheStatus: "HIT" | "MISS";
  generateMs: number;
}): Record<string, string> {
  return {
    "Content-Type": "image/webp",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Preview-Status": opts.cacheStatus,
    "X-Preview-Generate-Ms": String(opts.generateMs),
    "X-Content-Type-Options": "nosniff",
  };
}
