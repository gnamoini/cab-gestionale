/** Easing condiviso pannelli collapsible (ShellCard, Documenti, impostazioni). */
export const gestionaleCollapsibleEase = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/** Griglia animata apertura/chiusura corpo sezione. */
export const gestionaleCollapsiblePanelGridClass = `grid transition-[grid-template-rows] duration-300 ${gestionaleCollapsibleEase} motion-reduce:transition-none`;

/** Wrapper interno pannello collapsible (altezza + fade contenuto). */
export const gestionaleCollapsiblePanelInnerClass =
  "min-h-0 overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none";

/** Box chevron in riga accordion (Documenti, gerarchie impostazioni). */
export const gestionaleCollapsibleChevronBoxClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[color:var(--cab-text-muted)] transition-[background-color,border-color] duration-300 motion-reduce:transition-none group-hover:bg-[var(--cab-hover)]";

export const gestionaleCollapsibleChevronBoxExpandedClass =
  "border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_92%,var(--cab-hover))]";

export const gestionaleCollapsibleChevronIconClass = `h-4 w-4 transition-transform duration-300 ${gestionaleCollapsibleEase} motion-reduce:transition-none`;

/** Trigger riga header accordion (titolo + chevron). */
export const gestionaleCollapsibleHeaderTriggerClass =
  "group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-1 text-left touch-manipulation transition-colors duration-200 ease-out hover:bg-[var(--cab-hover)] motion-reduce:transition-none";

/** Pulsante solo chevron — il titolo della sezione non fa parte della hitbox. */
export const gestionaleCollapsibleToggleBtnClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-[var(--ds-radius-lg)] border border-transparent touch-manipulation outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:border-[color:var(--cab-border)] hover:bg-[var(--cab-hover)] active:scale-[0.9] active:border-[color:var(--cab-border)] active:bg-[color:color-mix(in_srgb,var(--cab-hover)_90%,var(--cab-card))] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cab-bg-app)] motion-reduce:transition-none motion-reduce:active:transform-none";

export const gestionaleCollapsibleToggleBtnExpandedClass =
  "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_75%,var(--cab-card))] shadow-[var(--cab-shadow-sm)] active:shadow-none";

export const gestionaleCollapsibleSectionTitleHitboxClass = "pointer-events-none select-none";
