/**
 * Token UI condivisi pagina Report (solo presentazione).
 */

export const reportMetricCardClass =
  "flex min-w-0 flex-col rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-4 shadow-[var(--cab-shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--cab-shadow-md)]";

export const reportMetricCardCompactClass =
  "flex min-w-0 flex-col rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] p-3 shadow-[var(--cab-shadow-sm)]";

export const reportChartShellClass =
  "min-h-[160px] rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 shadow-[var(--cab-shadow-sm)] sm:min-h-[180px] sm:p-4";

export const reportCompareBannerClass =
  "mb-4 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-card))] px-3 py-2 text-xs leading-relaxed text-[color:var(--cab-text)]";

/** Titoli gruppo sezione (navigazione visiva) — neutro, allineato a ShellCard. */
export const reportSectionGroupTitleClass =
  "text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]";

/** Sottosezioni dentro una ShellCard report (grafici, tabelle). */
export const reportSubsectionTitleClass = "text-sm font-semibold text-[color:var(--cab-text)]";

export const reportSectionGroupDescClass = "mt-0.5 text-[11px] leading-snug text-[color:var(--cab-text-muted)]";

export const reportKpiDescriptionClass = "mt-0.5 text-[10px] leading-snug text-[color:var(--cab-text-muted)]";

/** ShellCard zona control tower. */
export const reportZoneShellClass = "scroll-mt-28";

export const reportExecutiveStripClass =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-card))] px-4 py-3 text-sm leading-relaxed text-[color:var(--cab-text)]";

/** Barra navigazione zone — sticky sotto header/filtri. */
export const reportZoneNavStickyClass =
  "sticky top-[var(--gestionale-sticky-offset,3.5rem)] z-20 -mx-1 bg-[color:color-mix(in_srgb,var(--cab-bg)_88%,transparent)] px-1 py-2 backdrop-blur-sm";

export const reportHealthChipClass =
  "inline-flex items-center gap-1.5 rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2 py-1 text-[11px] font-medium tabular-nums text-[color:var(--cab-text)]";

export const reportHealthChipWarningClass =
  "border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-card))]";

export const reportHealthChipCriticalClass =
  "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))]";

export const reportKpiTrustPillClass =
  "inline-flex shrink-0 rounded-md border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,var(--cab-card))] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]";

export type ReportCompareTone = "up" | "down" | "flat";

export function reportCompareToneClass(tone: ReportCompareTone): string {
  if (tone === "flat") return "text-[color:var(--cab-text-muted)]";
  return tone === "up"
    ? "text-[color:color-mix(in_srgb,var(--cab-success)_92%,var(--cab-text))]"
    : "text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]";
}
