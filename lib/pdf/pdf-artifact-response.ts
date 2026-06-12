function contentDispositionInline(fileName: string): string {
  const trimmed = fileName.trim().replace(/\s+/g, "_") || "documento.pdf";
  const withExt = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
  const asciiFallback = withExt.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "documento.pdf";
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(withExt)}`;
}

export function pdfArtifactResponseHeaders(opts: {
  fileName: string;
  cacheStatus: "HIT" | "MISS";
  generateMs: number;
  dataHash: string;
}): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": contentDispositionInline(opts.fileName),
    "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable",
    "X-Cache-Status": opts.cacheStatus,
    "X-PDF-Generate-Ms": String(opts.generateMs),
    "X-PDF-Data-Hash": opts.dataHash,
    "X-Content-Type-Options": "nosniff",
  };
}
