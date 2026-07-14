import type { LabelPayload, LabelTemplateDefinition, LabelTemplateElement } from "@/lib/inventory-labels/domain/types";
import { mmToPx, fontLineHeightMm } from "@/lib/inventory-labels/domain/templates";

/** A capo solo su spazi — mai spezzare parole (es. fotoelettrico → fotoelettr + ico). */
export function wrapLines(text: string, maxLines: number, maxCharsPerLine: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  if (maxLines <= 0) return [""];

  const lines: string[] = [];
  let current = "";

  const pushLine = (line: string) => {
    if (lines.length < maxLines && line) lines.push(line);
  };

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }
    if (current) {
      pushLine(current);
      current = "";
      if (lines.length >= maxLines) break;
    }
    // Parola intera sulla riga successiva (anche se supera maxChars — evita tagli a metà parola)
    if (lines.length < maxLines) {
      current = word;
    }
  }

  if (current && lines.length < maxLines) pushLine(current);
  return lines.length ? lines : [""];
}

export function fieldValue(payload: LabelPayload, field: keyof LabelPayload): string {
  return (payload[field] ?? "").trim();
}

export type LabelLayoutContext = {
  template: LabelTemplateDefinition;
  payload: LabelPayload;
  qrUrl: string;
  widthPx: number;
  heightPx: number;
};

export function maxCharsForWrap(mm: number, fontPt: number, font?: "sans" | "mono"): number {
  // Conservativo per a capo — evita overflow orizzontale (es. «M12» fuori bordo)
  const density = font === "mono" ? 4.0 : 4.65;
  return Math.max(4, Math.floor((mm / fontPt) * density));
}

export function maxCharsForWidth(mm: number, fontPt: number, font?: "sans" | "mono"): number {
  const density = font === "mono" ? 4.35 : 5.5;
  return Math.max(4, Math.floor((mm / fontPt) * density));
}

export function linesFitWrapWidth(
  lines: string[],
  widthMm: number,
  fontPt: number,
  font?: "sans" | "mono",
): boolean {
  const max = maxCharsForWrap(widthMm, fontPt, font);
  return lines.every((line) => line.length <= max);
}

/** Font più grande che mantiene `text` su una riga nella larghezza disponibile. */
export function maxSingleLineFontPt(
  text: string,
  widthMm: number,
  minPt: number,
  maxPt: number,
  font: "sans" | "mono" = "mono",
): number {
  if (!text) return maxPt;
  for (let pt = maxPt; pt >= minPt; pt -= 0.5) {
    if (text.length <= maxCharsForWidth(widthMm, pt, font)) return pt;
  }
  return minPt;
}

export type ResolvedTextPlacement = {
  lines: string[];
  yMm: number;
};

export function resolveTextPlacement(
  el: Extract<LabelTemplateElement, { type: "text" }>,
  payload: LabelPayload,
  template: LabelTemplateDefinition,
): ResolvedTextPlacement {
  const value = fieldValue(payload, el.field);
  const widthMm = el.maxWidthMm ?? template.widthMm - el.xMm - 2;
  const chars = maxCharsForWrap(widthMm, el.fontPt, el.font);
  const lh = fontLineHeightMm(el.fontPt);

  const zoneBottom =
    el.zoneBottomMm ?? el.yMm + lh * Math.max(1, el.maxLines ?? 1);
  const zoneH = Math.max(lh, zoneBottom - el.yMm);
  const maxLines = Math.max(1, Math.floor(zoneH / lh));

  const lines = wrapLines(value, maxLines, chars);
  const blockH = lines.length * lh;
  let yMm = el.yMm;
  if (el.vAlign === "center") {
    yMm = el.yMm + Math.max(0, (zoneH - blockH) / 2);
  }

  return { lines, yMm };
}

export function layoutElementLines(
  el: Extract<LabelTemplateElement, { type: "text" }>,
  payload: LabelPayload,
  template: LabelTemplateDefinition,
): string[] {
  return resolveTextPlacement(el, payload, template).lines;
}

export function templateDimensionsPx(template: LabelTemplateDefinition): { widthPx: number; heightPx: number } {
  return {
    widthPx: mmToPx(template.widthMm, template.dpi),
    heightPx: mmToPx(template.heightMm, template.dpi),
  };
}
