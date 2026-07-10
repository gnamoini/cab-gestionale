/**
 * SSOT token per liste non-tabella (settings, hub, pannelli).
 * Tabelle dense: gestionale-list-table.ts
 */

export const LIST_DIVIDER_UL = "divide-y divide-[color:var(--cab-border)]";

export const LIST_ROW_SHELL =
  "group flex min-h-11 min-w-0 w-full max-w-full flex-wrap items-center gap-x-2 gap-y-2 bg-[var(--cab-card)] px-3 py-2 transition-[background-color] duration-150 ease-out hover:bg-[var(--cab-hover)] sm:flex-nowrap sm:gap-x-3 [-webkit-tap-highlight-color:transparent]";

export const LIST_EMPTY_STATE =
  "rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-4 py-8 text-center text-xs text-[color:var(--cab-text-muted)]";

export const LIST_EMPTY_STATE_INLINE =
  "px-4 py-8 text-center text-xs text-[color:var(--cab-text-muted)]";

/** Inline duplicate da evitare — usare LIST_DIVIDER_UL */
export const LIST_DIVIDER_UL_FORBIDDEN_INLINE = "divide-y divide-[color:var(--cab-border)]";

export const LIST_LOADING_STATE =
  "animate-pulse rounded-[var(--ds-radius-md)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-2";

export const LIST_ERROR_STATE =
  "rounded-[var(--ds-radius-md)] border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))] px-3 py-2 text-xs text-[color:var(--cab-danger)]";

/** @deprecated use LIST_DIVIDER_UL — alias per migrazione settings-list-ui */
export const SETTINGS_LIST_DIVIDER_UL_ALIAS = LIST_DIVIDER_UL;
