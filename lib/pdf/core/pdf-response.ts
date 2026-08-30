import { pdfPhaseResponseHeaders, type PdfDeliveryPhases } from "@/lib/pdf/core/pdf-delivery-phases";

function contentDispositionInline(fileName: string): string {
  const trimmed = fileName.trim().replace(/\s+/g, "_") || "documento.pdf";
  const withExt = trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
  const asciiFallback = withExt.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "documento.pdf";
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(withExt)}`;
}

/** Audit gate: URL artifact non include dataHash — browser cache solo con ETag + 304. */
export const PDF_ARTIFACT_BROWSER_CACHE_MAX_AGE_SEC = 300;

export type PdfArtifactResponseInput = {
  fileName: string;
  cacheStatus: "HIT" | "MISS";
  generateMs: number;
  dataHash: string;
  phases?: PdfDeliveryPhases;
};

export function pdfArtifactEtag(dataHash: string): string {
  return `"${dataHash}"`;
}

export function pdfArtifactResponseHeaders(opts: PdfArtifactResponseInput): Record<string, string> {
  const etag = pdfArtifactEtag(opts.dataHash);
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": contentDispositionInline(opts.fileName),
    ETag: etag,
    "Cache-Control": `private, max-age=${PDF_ARTIFACT_BROWSER_CACHE_MAX_AGE_SEC}`,
    "X-Cache-Status": opts.cacheStatus,
    "X-PDF-Generate-Ms": String(opts.generateMs),
    "X-PDF-Data-Hash": opts.dataHash,
    "X-Content-Type-Options": "nosniff",
    ...(opts.phases ? pdfPhaseResponseHeaders(opts.phases) : {}),
  };
}

export function pdfArtifactNotModifiedHeaders(dataHash: string): Record<string, string> {
  return {
    ETag: pdfArtifactEtag(dataHash),
    "Cache-Control": `private, max-age=${PDF_ARTIFACT_BROWSER_CACHE_MAX_AGE_SEC}`,
    "X-Cache-Status": "HIT",
    "X-PDF-Data-Hash": dataHash,
  };
}

export function pdfArtifactRequestEtagMatches(request: Request, dataHash: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match")?.trim();
  if (!ifNoneMatch) return false;
  const expected = pdfArtifactEtag(dataHash);
  return ifNoneMatch === expected || ifNoneMatch === dataHash;
}
