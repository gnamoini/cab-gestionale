import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js") as {
  Path: new () => { extend(path: unknown): void; toPathData(decimalPlaces?: number): string };
  parse(buffer: ArrayBuffer): LabelFont;
};

type LabelFontSlot = "sans" | "mono";

const FONTS_DIR = join(process.cwd(), "lib/inventory-labels/render/fonts");

type LabelFont = {
  unitsPerEm: number;
  ascender: number;
  charToGlyph(char: string): { advanceWidth?: number };
  getPath(text: string, x: number, y: number, fontSize: number): { extend(path: unknown): void; toPathData(decimalPlaces?: number): string };
};

let sansFont: LabelFont | null = null;
let monoFont: LabelFont | null = null;

function loadFont(slot: LabelFontSlot): LabelFont {
  if (slot === "mono") {
    if (!monoFont) monoFont = opentype.parse(readFileSync(join(FONTS_DIR, "LabelMono.ttf")).buffer);
    return monoFont;
  }
  if (!sansFont) sansFont = opentype.parse(readFileSync(join(FONTS_DIR, "LabelSans.ttf")).buffer);
  return sansFont;
}

/** Larghezza ink di una riga in px — per centratura orizzontale path. */
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
