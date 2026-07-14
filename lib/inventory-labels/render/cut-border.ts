import { mmToPx } from "@/lib/inventory-labels/domain/templates";

export function cutBorderRectSvg(
  widthPx: number,
  heightPx: number,
  cutBorderMm: number | undefined,
  dpi: number,
): string | null {
  if (!cutBorderMm || cutBorderMm <= 0) return null;
  const inset = mmToPx(0.6, dpi);
  const strokeW = 0.75;
  return `<rect x="${inset}" y="${inset}" width="${widthPx - inset * 2}" height="${heightPx - inset * 2}" fill="none" stroke="#999999" stroke-width="${strokeW}"/>`;
}
