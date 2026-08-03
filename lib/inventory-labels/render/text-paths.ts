import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { mmToPx, ptToPx } from "@/lib/inventory-labels/domain/templates";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js") as {
  Path: new () => { extend(path: unknown): void; toPathData(decimalPlaces?: number): string };
  parse(buffer: ArrayBuffer): LabelFont;
};

type LabelFontSlot = "sans" | "sansBold" | "mono" | "monoBold";

const FONTS_DIR = join(process.cwd(), "lib/inventory-labels/render/fonts");

type LabelFont = {
  unitsPerEm: number;
  ascender: number;
  charToGlyph(char: string): { advanceWidth?: number };
  getPath(text: string, x: number, y: number, fontSize: number): { extend(path: unknown): void; toPathData(decimalPlaces?: number): string };
};

let sansFont: LabelFont | null = null;
let sansBoldFont: LabelFont | null = null;
let monoFont: LabelFont | null = null;
let monoBoldFont: LabelFont | null = null;

function loadFont(slot: LabelFontSlot): LabelFont {
  if (slot === "monoBold") {
    if (!monoBoldFont) monoBoldFont = opentype.parse(readFileSync(join(FONTS_DIR, "LabelMonoBold.ttf")).buffer);
    return monoBoldFont;
  }
  if (slot === "mono") {
    if (!monoFont) monoFont = opentype.parse(readFileSync(join(FONTS_DIR, "LabelMono.ttf")).buffer);
    return monoFont;
  }
  if (slot === "sansBold") {
    if (!sansBoldFont) sansBoldFont = opentype.parse(readFileSync(join(FONTS_DIR, "LabelSansBold.ttf")).buffer);
    return sansBoldFont;
  }
  if (!sansFont) sansFont = opentype.parse(readFileSync(join(FONTS_DIR, "LabelSans.ttf")).buffer);
  return sansFont;
}

/** Slot opentype per etichetta — A4 bold usa TTF nativi (no stroke). */
export function labelFontSlotFor(
  base: "sans" | "mono",
  bold: boolean,
  nativeBoldFont: boolean,
): LabelFontSlot {
  if (!nativeBoldFont || !bold) return base;
  return base === "mono" ? "monoBold" : "sansBold";
}

export function labelFontFamilyForSlot(slot: LabelFontSlot): string {
  switch (slot) {
    case "sansBold":
      return "LabelSansBold";
    case "monoBold":
      return "LabelMonoBold";
    case "mono":
      return "LabelMono";
    default:
      return "LabelSans";
  }
}

export type { LabelFontSlot };
export function measureTextLineWidthPx(
  text: string,
  fontSizePx: number,
  slot: LabelFontSlot,
): number {
  const font = loadFont(slot);
  const scale = fontSizePx / font.unitsPerEm;
  let width = 0;
  for (const char of text) {
    const glyph = font.charToGlyph(char);
    width += (glyph.advanceWidth ?? font.unitsPerEm * 0.5) * scale;
  }
  return width;
}

/** Caratteri per riga basati su larghezza ink reale (bold A4). */
export function maxCharsForInkWidth(
  widthMm: number,
  fontPt: number,
  dpi: number,
  slot: LabelFontSlot,
  sampleChar = "M",
): number {
  const fontSizePx = ptToPx(fontPt, dpi);
  const maxPx = mmToPx(widthMm, dpi);
  let n = 1;
  while (n <= 500 && measureTextLineWidthPx(sampleChar.repeat(n), fontSizePx, slot) <= maxPx) {
    n++;
  }
  return Math.max(1, n - 1);
}

export function linesFitInkWidthMm(
  lines: string[],
  widthMm: number,
  fontPt: number,
  dpi: number,
  slot: LabelFontSlot,
): boolean {
  const fontSizePx = ptToPx(fontPt, dpi);
  const maxPx = mmToPx(widthMm, dpi);
  return lines.every((line) => measureTextLineWidthPx(line, fontSizePx, slot) <= maxPx);
}

const INK_ELLIPSIS = "…";

function truncateLineToInkWidth(
  text: string,
  maxPx: number,
  fontSizePx: number,
  slot: LabelFontSlot,
): string {
  if (measureTextLineWidthPx(text, fontSizePx, slot) <= maxPx) return text;
  let t = text;
  while (t.length > 0 && measureTextLineWidthPx(t + INK_ELLIPSIS, fontSizePx, slot) > maxPx) {
    t = t.slice(0, -1);
  }
  return t.length < text.length ? `${t}${INK_ELLIPSIS}` : t;
}

/** Solo righe che eccedono ink — mantiene parole intere quando possibile. */
export function refitLinesToInkWidth(
  lines: string[],
  maxLines: number,
  widthMm: number,
  fontPt: number,
  dpi: number,
  slot: LabelFontSlot,
  breakMode: "words" | "chars" | "codice",
): string[] {
  const fontSizePx = ptToPx(fontPt, dpi);
  const maxPx = mmToPx(widthMm, dpi);
  const fits = (s: string) => measureTextLineWidthPx(s, fontSizePx, slot) <= maxPx;
  const charMode = breakMode !== "words";

  const out: string[] = [];
  for (const line of lines) {
    if (fits(line)) {
      out.push(line);
      continue;
    }
    if (charMode) {
      let rest = line;
      while (rest && out.length < maxLines) {
        let n = rest.length;
        while (n > 1 && !fits(rest.slice(0, n))) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      continue;
    }
    const words = line.trim().split(/\s+/).filter(Boolean);
    let cur = "";
    for (const word of words) {
      if (out.length >= maxLines) break;
      const next = cur ? `${cur} ${word}` : word;
      if (fits(next)) {
        cur = next;
        continue;
      }
      if (cur) {
        out.push(cur);
        cur = "";
        if (out.length >= maxLines) break;
      }
      if (fits(word)) {
        cur = word;
        continue;
      }
      // ponytail: parola più larga della riga — split a carattere
      let rest = word;
      while (rest && out.length < maxLines) {
        let n = rest.length;
        while (n > 1 && !fits(rest.slice(0, n))) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
    }
    if (cur && out.length < maxLines) out.push(cur);
  }

  if (out.length > maxLines) out.length = maxLines;
  if (out.length) {
    const last = out.length - 1;
    out[last] = truncateLineToInkWidth(out[last]!, maxPx, fontSizePx, slot);
  }
  return out.length ? out : [""];
}

/** Converte una riga in `<path>` — librsvg non richiede fontconfig. */
export function textLineToSvgPath(
  text: string,
  x: number,
  y: number,
  fontSizePx: number,
  slot: LabelFontSlot,
  baseline: "hanging" | "alphabetic",
): string {
  const font = loadFont(slot);
  const scale = fontSizePx / font.unitsPerEm;
  const baselineY = baseline === "hanging" ? y + font.ascender * scale : y;
  const path = new opentype.Path();
  let xCursor = x;

  for (const char of text) {
    const glyph = font.charToGlyph(char);
    path.extend(font.getPath(char, xCursor, baselineY, fontSizePx));
    xCursor += (glyph.advanceWidth ?? font.unitsPerEm * 0.5) * scale;
  }

  const d = path.toPathData(2);
  return `<path d="${d}" fill="#000000"/>`;
}
