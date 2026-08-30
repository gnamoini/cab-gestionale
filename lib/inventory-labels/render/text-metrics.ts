import { ptToPx } from "@/lib/inventory-labels/domain/templates";

/** Ink caps DejaVu embedded — righe fornitore/codice alt sono sempre maiuscole. */
const CAP_HEIGHT_RATIO = 0.72;

/** Metriche riga allineate a `svg.ts` (`fontPt` + `lineStep = fontPt * 1.2`). */
export function lineMetrics(fontPt: number, dpi: number) {
  const fontSizePx = ptToPx(fontPt, dpi);
  const lineStepPx = ptToPx(fontPt * 1.2, dpi);
  const pxToMm = 25.4 / dpi;
  return {
    fontSizePx,
    lineStepPx,
    fontHeightMm: fontSizePx * pxToMm,
    lineStepMm: lineStepPx * pxToMm,
  };
}

export function capHeightMm(fontPt: number, dpi: number): number {
  return lineMetrics(fontPt, dpi).fontHeightMm * CAP_HEIGHT_RATIO;
}

/** Baseline riga fornitore/codice alt — alzata rispetto al fondo etichetta (caps, no discendenti visibili). */
export function supplierCapBaselineMm(labelBottomMm: number, fontPt: number, dpi: number): number {
  const liftMm = Math.max(0.35, lineMetrics(fontPt, dpi).fontHeightMm * 0.14);
  return labelBottomMm - liftMm;
}

export function blockHeightMm(lineCount: number, fontPt: number, dpi: number): number {
  if (lineCount <= 0) return 0;
  const { fontHeightMm, lineStepMm } = lineMetrics(fontPt, dpi);
  return fontHeightMm + (lineCount - 1) * lineStepMm;
}

export function maxLinesForZoneMm(zoneHmm: number, fontPt: number, dpi: number): number {
  const { fontHeightMm, lineStepMm } = lineMetrics(fontPt, dpi);
  if (zoneHmm <= 0) return 1;
  if (zoneHmm <= fontHeightMm) return 1;
  return Math.max(1, Math.floor((zoneHmm - fontHeightMm) / lineStepMm) + 1);
}

/** Baseline riga successiva — `rowStepMm` = passo righe descrizione (uniforme tra blocchi). */
export function nextRowBaselineMm(
  yMm: number,
  lineCount: number,
  fontPt: number,
  rowStepMm: number,
  dpi: number,
): number {
  const n = Math.max(1, lineCount);
  const { lineStepMm } = lineMetrics(fontPt, dpi);
  return yMm + (n - 1) * lineStepMm + rowStepMm;
}

export function stackBottomMmFrom(
  startMm: number,
  blocks: Array<{ lines: string[]; fontPt: number }>,
  rowStepMm: number,
  dpi: number,
): number {
  let y = startMm;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    const n = Math.max(1, b.lines.length);
    if (i < blocks.length - 1) {
      y = nextRowBaselineMm(y, n, b.fontPt, rowStepMm, dpi);
    } else {
      const { lineStepMm, fontHeightMm } = lineMetrics(b.fontPt, dpi);
      y = y + (n - 1) * lineStepMm + fontHeightMm;
    }
  }
  return y;
}
