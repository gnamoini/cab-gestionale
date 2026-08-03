import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FONTS_DIR = join(process.cwd(), "lib/inventory-labels/render/fonts");
const FONTS_CONF = join(FONTS_DIR, "fonts.conf");

function fontDataUri(filename: string, format: "woff2" | "ttf"): string {
  const buf = readFileSync(join(FONTS_DIR, filename));
  const mime = format === "woff2" ? "font/woff2" : "font/ttf";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

let cachedCss: string | null = null;
let fontConfigReady = false;

/** librsvg/sharp su Linux ignora @font-face embedded — serve fontconfig + TTF. */
export function usesFontConfigForLabelRaster(): boolean {
  return process.platform === "linux";
}

/** Configura fontconfig prima di sharp (Vercel/serverless Linux). */
export function ensureLabelFontConfig(): void {
  if (fontConfigReady || !usesFontConfigForLabelRaster()) return;
  if (!existsSync(FONTS_CONF)) return;
  if (!process.env.FONTCONFIG_FILE) {
    process.env.FONTCONFIG_FILE = FONTS_CONF;
  }
  process.env.FC_CACHEDIR ??= "/tmp/fontconfig-labels-cache";
  fontConfigReady = true;
}

/** @font-face embedded — browser SVG e dev Windows/macOS (librsvg locale). */
export function labelFontFaceCss(): string {
  if (cachedCss) return cachedCss;
  const sans = fontDataUri("LabelSans.woff2", "woff2");
  const mono = fontDataUri("LabelMono.woff2", "woff2");
  const sansBold = fontDataUri("LabelSansBold.ttf", "ttf");
  const monoBold = fontDataUri("LabelMonoBold.ttf", "ttf");
  cachedCss = `@font-face{font-family:'LabelSans';src:url('${sans}') format('woff2');font-weight:normal;font-style:normal;}@font-face{font-family:'LabelMono';src:url('${mono}') format('woff2');font-weight:normal;font-style:normal;}@font-face{font-family:'LabelSansBold';src:url('${sansBold}') format('truetype');font-weight:normal;font-style:normal;}@font-face{font-family:'LabelMonoBold';src:url('${monoBold}') format('truetype');font-weight:normal;font-style:normal;}`;
  return cachedCss;
}
