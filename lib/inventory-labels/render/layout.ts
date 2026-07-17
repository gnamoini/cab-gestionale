import type { LabelPayload, LabelTemplateDefinition, LabelTemplateElement } from "@/lib/inventory-labels/domain/types";
import { mmToPx, fontLineHeightMm } from "@/lib/inventory-labels/domain/templates";

/** A capo su spazi — parola intera sulla riga successiva, mai spezzata se evitabile. */
export function wrapLines(text: string, maxLines: number, maxCharsPerLine: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  if (maxLines <= 0) return [""];

  const perLine = Math.max(1, maxCharsPerLine);
  const lines: string[] = [];
  let current = "";

  const pushLine = (line: string) => {
    if (lines.length < maxLines && line) lines.push(line);
  };

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const next = current ? `${current} ${word}` : word;
    if (next.length <= perLine) {
      current = next;
      continue;
    }
    if (current) {
      pushLine(current);
      current = "";
      if (lines.length >= maxLines) break;
    }
    // ponytail: parola intera a capo anche se supera maxChars — no split mid-word
    if (lines.length < maxLines) {
      current = word;
    }
  }

  if (current && lines.length < maxLines) pushLine(current);
  return lines.length ? lines : [""];
}

/** A capo a carattere — codici OE / fornitore senza spazi. */
export function wrapChars(text: string, maxLines: number, maxCharsPerLine: number): string[] {
  const t = text.trim();
  if (!t) return [""];
  if (maxLines <= 0) return [""];
  const perLine = Math.max(1, maxCharsPerLine);
  const lines: string[] = [];
  for (let i = 0; i < t.length && lines.length < maxLines; i += perLine) {
    lines.push(t.slice(i, i + perLine));
  }
  return lines.length ? lines : [""];
}

export function wrapCodiceLabelLine(
  text: string,
  maxLines: number,
  wrapCharsPerLine: number,
  fitCharsPerLine = wrapCharsPerLine,
): string[] {
  const t = text.trim();
  if (!t) return [""];
  const wrapPer = Math.max(1, wrapCharsPerLine);
  const fitPer = Math.max(wrapPer, fitCharsPerLine);
  if (maxLines <= 0) return [""];

  const marcaSuffix = t.match(/^(.+?)\s+(\([^)]+\))$/);
  if (!marcaSuffix) return wrapChars(t, maxLines, wrapPer);

  const [, code, marca] = marcaSuffix;
  const full = `${code} ${marca}`;

  if (full.length <= fitPer) return [full];

  const codeLines = wrapChars(code, maxLines, wrapPer);
  if (!codeLines.length) return [""];

  const lastIdx = codeLines.length - 1;
  const withMarca = `${codeLines[lastIdx]} ${marca}`;
  if (withMarca.length <= fitPer) {
    codeLines[lastIdx] = withMarca;
    return codeLines;
  }

  if (codeLines.length < maxLines) return [...codeLines, marca];

  const suffix = ` ${marca}`;
  const room = fitPer - suffix.length;
  if (room < 1) return codeLines;

  const consumedBefore = codeLines.slice(0, -1).join("").length;
  const trimmed = code.slice(consumedBefore, consumedBefore + room);
  codeLines[lastIdx] = `${trimmed}${suffix}`;
  return codeLines;
}

export function wrapLabelLines(
  text: string,
  maxLines: number,
  maxCharsPerLine: number,
  breakMode: "words" | "chars" | "codice" = "words",
  fitCharsPerLine?: number,
): string[] {
  if (breakMode === "codice") {
    return wrapCodiceLabelLine(text, maxLines, maxCharsPerLine, fitCharsPerLine ?? maxCharsPerLine);
  }
  return breakMode === "chars"
    ? wrapChars(text, maxLines, maxCharsPerLine)
    : wrapLines(text, maxLines, maxCharsPerLine);
}

export function isFullyWrapped(
  text: string,
  lines: string[],
  maxCharsPerLine: number,
  breakMode: "words" | "chars",
): boolean {
  const full = wrapLabelLines(text, 256, maxCharsPerLine, breakMode);
  const norm = (ls: string[]) => (breakMode === "chars" ? ls.join("") : ls.join(" "));
  return norm(full) === norm(lines);
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

/** Larghezza reale tipografica — per righe codice+marca che sfruttano il margine visivo. */
export function linesFitDisplayWidth(
  lines: string[],
  widthMm: number,
  fontPt: number,
  font?: "sans" | "mono",
): boolean {
  const max = maxCharsForWidth(widthMm, fontPt, font);
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
