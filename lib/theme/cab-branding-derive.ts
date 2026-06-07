import { normalizeHex, relativeLuminance } from "@/lib/lavorazioni/color-utils";
import { CAB_DEFAULT_PRIMARY } from "@/lib/theme/cab-branding-defaults";

/** Hover primario coerente con `color-mix(in srgb, primary 88%, black)`. */
export function derivePrimaryHover(primaryHex: string): string {
  const hex = normalizeHex(primaryHex) ?? CAB_DEFAULT_PRIMARY;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c * 0.88);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/** Rapporto di contrasto WCAG tra due colori (1–21). */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const L1 = relativeLuminance(fgHex);
  const L2 = relativeLuminance(bgHex);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type BrandingContrastWarning = {
  kind: "primary_on_white" | "primary_on_surface";
  ratio: number;
  message: string;
};

export function getBrandingContrastWarnings(primaryHex: string | null | undefined): BrandingContrastWarning[] {
  const hex = normalizeHex(primaryHex);
  if (!hex) return [];
  const warnings: BrandingContrastWarning[] = [];
  const onWhite = contrastRatio(hex, "#ffffff");
  if (onWhite < 4.5) {
    warnings.push({
      kind: "primary_on_white",
      ratio: onWhite,
      message: `Contrasto insufficiente su pulsanti primari (${onWhite.toFixed(1)}:1, minimo consigliato 4.5:1).`,
    });
  }
  const onSurface = contrastRatio(hex, "#fafafa");
  if (onSurface < 3) {
    warnings.push({
      kind: "primary_on_surface",
      ratio: onSurface,
      message: `Leggibilità link/icone ridotta su sfondo chiaro (${onSurface.toFixed(1)}:1).`,
    });
  }
  return warnings;
}
