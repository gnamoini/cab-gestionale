/**
 * Arancione brand CAB (logo) — monocolore, senza gradienti.
 * Fonte di verità per CSS: `--cab-primary` / `--cab-primary-hover` in `app/globals.css`.
 */
export const CAB_BRAND_ORANGE = "#f97316" as const;
export const CAB_BRAND_ORANGE_HOVER = "#ea580c" as const;

/** Classi Tailwind riutilizzabili per accenti (solo colore piatto). */
export const cabAccentTextClass = "text-[color:var(--cab-primary)]";
export const cabAccentBgClass = "bg-[var(--cab-primary)]";
export const cabAccentBgSoftClass =
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))]";
export const cabAccentBorderClass =
  "border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))]";
export const cabAccentHoverSoftClass =
  "hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]";
