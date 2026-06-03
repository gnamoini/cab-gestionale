/**
 * Arancione brand CAB (logo) — monocolore, senza gradienti.
 * Fonte di verità per CSS: `--cab-primary` / `--cab-primary-hover` in `app/globals.css`.
 */
export const CAB_BRAND_ORANGE = "#ff6633" as const;
export const CAB_BRAND_ORANGE_HOVER = "#e05a2d" as const;

/** Classi Tailwind riutilizzabili per accenti (testo/logo arancione piatto). */
export const cabAccentTextClass = "text-[color:var(--cab-primary)]";
export const cabPrimaryBgClass = "bg-[color:var(--cab-primary)]";
export const cabAccentBgClass = "bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))]";
export const cabAccentBgSoftClass =
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))]";
export const cabAccentBorderClass =
  "border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))]";
export const cabAccentHoverSoftClass =
  "hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]";
