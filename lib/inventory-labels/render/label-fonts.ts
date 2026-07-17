import { readFileSync } from "node:fs";
import { join } from "node:path";

const FONTS_DIR = join(process.cwd(), "lib/inventory-labels/render/fonts");

function fontDataUri(filename: string): string {
  const buf = readFileSync(join(FONTS_DIR, filename));
  return `data:font/woff2;base64,${buf.toString("base64")}`;
}

let cachedCss: string | null = null;

/** @font-face embedded — librsvg/sharp non risolve sans-serif generici. */
export function labelFontFaceCss(): string {
  if (cachedCss) return cachedCss;
  const sans = fontDataUri("LabelSans.woff2");
  const mono = fontDataUri("LabelMono.woff2");
  cachedCss = `@font-face{font-family:'LabelSans';src:url('${sans}') format('woff2');font-weight:normal;font-style:normal;}@font-face{font-family:'LabelMono';src:url('${mono}') format('woff2');font-weight:normal;font-style:normal;}`;
  return cachedCss;
}
