export type SvgFragment = { viewBox: string; inner: string };

/** Estrae viewBox + contenuto da SVG generato da librerie esterne (qrcode, bwip-js). */
export function parseSvgFragment(svg: string): SvgFragment {
  const cleaned = svg.replace(/<\?xml[^?]*\?>/i, "").trim();
  const openTag = cleaned.match(/<svg\b([^>]*)>/i);
  if (!openTag) throw new Error("SVG senza root");
  const attrs = openTag[1];
  const viewBoxMatch = attrs.match(/\bviewBox="([^"]+)"/i);
  const wMatch = attrs.match(/\bwidth="([^"]+)"/i);
  const hMatch = attrs.match(/\bheight="([^"]+)"/i);
  let viewBox = viewBoxMatch?.[1];
  if (!viewBox && wMatch && hMatch) {
    const w = wMatch[1].replace(/[^\d.]/g, "");
    const h = hMatch[1].replace(/[^\d.]/g, "");
    if (w && h) viewBox = `0 0 ${w} ${h}`;
  }
  if (!viewBox) viewBox = "0 0 1 1";
  const inner = cleaned.replace(/<svg\b[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
  return { viewBox, inner };
}

export function nestedSvgAt(
  x: number,
  y: number,
  w: number,
  h: number,
  frag: SvgFragment,
  preserveAspectRatio = "xMidYMid meet",
): string {
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${frag.viewBox}" preserveAspectRatio="${preserveAspectRatio}">${frag.inner}</svg>`;
}

function parseSvgInkBounds(inner: string): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxStroke = 0;
  const pathRe = /\bd="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(inner))) {
    const nums = m[1].match(/-?[\d.]+/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i]!;
      const y = nums[i + 1]!;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const strokeRe = /stroke-width="([\d.]+)"/g;
  while ((m = strokeRe.exec(inner))) {
    maxStroke = Math.max(maxStroke, Number(m[1]));
  }
  if (!Number.isFinite(minX)) return null;
  const pad = maxStroke / 2;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

/** Ritaglia quiet zone — barre a larghezza piena come il QR (margin 0). */
export function cropSvgFragmentToInkBounds(frag: SvgFragment): SvgFragment {
  const bounds = parseSvgInkBounds(frag.inner);
  if (!bounds) return frag;
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (w <= 0 || h <= 0) return frag;
  return {
    viewBox: `${bounds.minX} ${bounds.minY} ${w} ${h}`,
    inner: frag.inner,
  };
}
