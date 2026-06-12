import type { DocumentDeliveryMode, DocumentDeliverySource } from "@/lib/documents/document-delivery-types";

function contentDisposition(fileName: string, mode: DocumentDeliveryMode): string {
  const trimmed = fileName.trim().replace(/\s+/g, "_") || "documento";
  const asciiFallback = trimmed.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "documento";
  const disposition = mode === "download" ? "attachment" : "inline";
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(trimmed)}`;
}

export function documentDeliveryResponseHeaders(opts: {
  fileName: string;
  contentType: string;
  mode: DocumentDeliveryMode;
  source: DocumentDeliverySource;
}): Record<string, string> {
  return {
    "Content-Type": opts.contentType,
    "Content-Disposition": contentDisposition(opts.fileName, opts.mode),
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Document-Source": opts.source,
    "X-Content-Type-Options": "nosniff",
  };
}
