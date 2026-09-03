import { mmToPx } from "@/lib/inventory-labels/domain/templates";

export function cutBorderRectSvg(
  widthPx: number,
  heightPx: number,
  cutBorderMm: number | undefined,
  dpi: number,
  mode: "legacy" | "uniform" | "mezzo" = "legacy",
): string | null {
  if (!cutBorderMm || cutBorderMm <= 0) return null;

  if (mode === "mezzo") {
    // Linea di taglio sul perimetro etichetta mezzo (stroke centrato sul bordo esterno).
    const strokeW = Math.max(1, Math.round(mmToPx(0.12, dpi)));
    const inset = strokeW / 2;
    return `<rect x="${inset}" y="${inset}" width="${widthPx - strokeW}" height="${heightPx - strokeW}" fill="none" stroke="#000000" stroke-width="${strokeW}"/>`;
  }

  if (mode === "uniform") {
    const borderPx = mmToPx(cutBorderMm, dpi);
    const inset = borderPx / 2;
    return `<rect x="${inset}" y="${inset}" width="${widthPx - borderPx}" height="${heightPx - borderPx}" fill="none" stroke="#888888" stroke-width="${borderPx}"/>`;
  }

  const inset = mmToPx(0.5, dpi);
  const strokeW = 1.25;
  return `<rect x="${inset}" y="${inset}" width="${widthPx - inset * 2}" height="${heightPx - inset * 2}" fill="none" stroke="#888888" stroke-width="${strokeW}"/>`;
}
