// bwip-js — Code128 (no server-only: testabile in tsx)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bwipjs = require("bwip-js") as {
  toBuffer: (opts: Record<string, unknown>) => Promise<Buffer>;
  toSVG: (opts: Record<string, unknown>) => string;
};

const BARCODE_DPI = 300;

export async function generateCode128PngBuffer(text: string, widthPx: number, heightPx: number): Promise<Buffer> {
  const widthMm = (widthPx / BARCODE_DPI) * 25.4;
  const heightMm = (heightPx / BARCODE_DPI) * 25.4;
  return bwipjs.toBuffer({
    bcid: "code128",
    text: text.trim() || " ",
    width: widthMm,
    height: heightMm,
    includetext: false,
    backgroundcolor: "ffffff",
  });
}

/** Code128 a larghezza etichetta — `width`/`height` in mm (bwip-js). */
export function generateCode128SvgString(text: string, widthMm: number, heightMm: number): string {
  const t = text.trim() || " ";
  return bwipjs.toSVG({
    bcid: "code128",
    text: t,
    width: widthMm,
    height: heightMm,
    includetext: false,
    backgroundcolor: "ffffff",
  });
}
