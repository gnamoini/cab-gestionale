export const SIGNATURE_PAD_STROKE_WIDTH = 3.5;
export const SIGNATURE_PAD_INK = "#111827";
export const SIGNATURE_PAD_EXPORT_MIME = "image/png" as const;
export const SIGNATURE_PAD_EXPORT_QUALITY = 0.85;

export type SignaturePadPoint = { x: number; y: number };

export function applySignaturePadStroke(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = SIGNATURE_PAD_INK;
  ctx.fillStyle = SIGNATURE_PAD_INK;
  ctx.lineWidth = SIGNATURE_PAD_STROKE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export function setupSignaturePadContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  applySignaturePadStroke(ctx);
}

/** Segmento firma — tratto costante dal primo contatto (anche tap senza drag). */
export function drawSignaturePadSegment(
  ctx: CanvasRenderingContext2D,
  from: SignaturePadPoint,
  to: SignaturePadPoint,
): void {
  applySignaturePadStroke(ctx);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx * dx + dy * dy < 1e-4) {
    ctx.beginPath();
    ctx.arc(from.x, from.y, SIGNATURE_PAD_STROKE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

export function exportSignatureDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL(SIGNATURE_PAD_EXPORT_MIME, SIGNATURE_PAD_EXPORT_QUALITY);
}

export function hasSignatureDataUrl(value: string | null | undefined): boolean {
  return Boolean(value?.trim().startsWith("data:image/"));
}
