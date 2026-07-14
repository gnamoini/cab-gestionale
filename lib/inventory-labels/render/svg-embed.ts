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
