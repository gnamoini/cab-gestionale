export const SIGNATURE_PAD_STROKE_WIDTH = 2.25;
export const SIGNATURE_PAD_EXPORT_MIME = "image/png" as const;
export const SIGNATURE_PAD_EXPORT_QUALITY = 0.85;

export function setupSignaturePadContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = SIGNATURE_PAD_STROKE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export function exportSignatureDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL(SIGNATURE_PAD_EXPORT_MIME, SIGNATURE_PAD_EXPORT_QUALITY);
}

export function hasSignatureDataUrl(value: string | null | undefined): boolean {
  return Boolean(value?.trim().startsWith("data:image/"));
}
