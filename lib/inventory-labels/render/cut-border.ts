import { mmToPx } from "@/lib/inventory-labels/domain/templates";

export function cutBorderRectSvg(
  widthPx: number,
  heightPx: number,
  cutBorderMm: number | undefined,
  dpi: number,
): string | null {
  if (!cutBorderMm || cutBorderMm <= 0) return null;
  const inset = mmToPx(0.5, dpi);
  const strokeW = 1.25;
  return `<rect x="${inset}" y="${inset}" width="${widthPx - inset * 2}" height="${heightPx - inset * 2}" fill="none" stroke="#888888" stroke-width="${strokeW}"/>`;
}
