/** Parametri viewer PDF inline (Chrome/Edge): nasconde toolbar e pannelli laterali. */
export function capturePdfPreviewUrl(fileUrl: string): string {
  return `${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`;
}

/** Fullscreen: viewer nativo, pagina in larghezza massima, scroll tra pagine. */
export function capturePdfFullscreenUrl(fileUrl: string): string {
  return `${fileUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
}

/** Shell HTML same-origin: scroll `gestionale-scrollbar`, PDF senza scrollbar nativa grigia. */
export function capturePdfPreviewFrameUrl(captureId: string, viewportWidthPx?: number): string {
  const w =
    typeof viewportWidthPx === "number" && Number.isFinite(viewportWidthPx) && viewportWidthPx > 0
      ? `?w=${Math.round(viewportWidthPx)}`
      : "";
  return `/api/document-capture/${captureId}/preview-frame${w}`;
}
