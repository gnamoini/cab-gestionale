/**
 * SSOT layout sidebar desktop — rail, riga nav, icona, trailing.
 * Geometria fissa tra collapsed / expanded / hover-expanded; solo label/trailing animano (opacity/clip).
 */

/** Larghezza rail collassata (allineata a `--cab-sidebar-rail-width` in globals.css). */
export const SIDEBAR_RAIL_WIDTH = "4.25rem";

/** Larghezza aside espansa (overlay). */
export const SIDEBAR_EXPANDED_WIDTH = "12.75rem";

/** Classe larghezza aside collassata / espansa (app-shell). */
export const sidebarAsideWidthCollapsedClass = "w-[4.25rem]";
export const sidebarAsideWidthExpandedClass = "w-[12.75rem]";

/** Shell riga nav sidebar — flex, altezza costante, nessuna transizione layout. */
export const sidebarNavRowClass = "cab-sidebar-nav-row group relative flex w-full min-w-0 shrink-0 items-center";

/** Track icona — ancoraggio X fisso via CSS var (single anchor rule). */
export const sidebarNavRowIconTrackClass =
  "cab-sidebar-nav-row__icon-track relative z-[1] flex shrink-0 items-center justify-center";

/** Shell icona 1.75rem (inattiva: sfondo zinc). */
export const sidebarNavIconShellClass =
  "cab-sidebar-nav-icon flex h-[var(--cab-sidebar-icon-size)] w-[var(--cab-sidebar-icon-size)] shrink-0 items-center justify-center rounded-md";

export const sidebarNavIconShellInactiveClass =
  "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-200";

export const sidebarNavIconShellActiveClass = "cab-sidebar-nav-icon--active";

/** Label — colonna flessibile; collapse via opacity/clip in CSS. */
export const sidebarNavRowLabelClass =
  "cab-sidebar-nav-row__label cab-sidebar-nav-label relative z-[1] min-w-0 flex-1 truncate text-left text-sm leading-tight";

/** Trailing — larghezza fissa (chevron / badge testuale). */
export const sidebarNavRowTrailingClass =
  "cab-sidebar-nav-row__trailing cab-sidebar-nav-row-trailing relative z-[1] flex shrink-0 items-center justify-end";

export const sidebarNavRowInactiveClass =
  "text-zinc-600 hover:bg-zinc-100/95 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/90 dark:hover:text-zinc-100";

export const sidebarNavRowDisabledClass = "cursor-not-allowed opacity-75";

/** Indicatore attivo unificato — morph rail ↔ row via CSS. */
export const sidebarActiveIndicatorClass = "cab-sidebar-active-indicator pointer-events-none absolute z-0";

export const sidebarNavCountBadgeClass =
  "cab-sidebar-nav-badge max-w-[4rem] shrink-0 overflow-hidden rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200";

/** Session panel open (profilo / notifiche). */
export const sidebarSessionItemOpenClass = "cab-sidebar-session-item--open";

/** @deprecated Usare sidebarNavRowClass — alias per migrazione graduale. */
export const sidebarNavLinkBase = `${sidebarNavRowClass} min-h-[var(--cab-sidebar-row-height)] rounded-lg text-sm font-medium`;

/** @deprecated Usare sidebarNavRowInactiveClass */
export const sidebarNavLinkInactive = sidebarNavRowInactiveClass;
