/** Easing condiviso pannelli collapsible (ShellCard, Documenti, impostazioni). */
export const gestionaleCollapsibleEase = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/** Griglia animata apertura/chiusura corpo sezione. */
export const gestionaleCollapsiblePanelGridClass = `grid transition-[grid-template-rows] duration-300 ${gestionaleCollapsibleEase} motion-reduce:transition-none`;

/** Corpo pannello collapsible — sfondo opaco su tutti i livelli (evita flash barra bianca in animazione). */
export const gestionaleCollapsiblePanelBodyClass = "bg-[var(--cab-card)]";

/** Corpo pannello collapsible inset (sottosezioni report) — opaco, allineato alla shell inset. */
export const gestionaleCollapsibleInsetPanelBodyClass =
  "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))]";

/** Padding corpo ShellCard collapsible — simmetrico con bordo superiore come separatore header/contenuto. */
export const gestionaleCollapsibleShellBodyPadClass =
  "-mt-px border-t border-[color:var(--cab-border)] px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5";

/** Variante compatta ShellCard collapsible. */
export const gestionaleCollapsibleShellBodyPadCompactClass = "px-2 pb-2 pt-0 sm:px-2.5 sm:pb-2.5";

/** Wrapper interno pannello collapsible (altezza). */
export const gestionaleCollapsiblePanelInnerClass = "min-h-0 overflow-hidden";

/** Box chevron in riga accordion (ShellCard Lavorazioni, form collapsible). */
export const gestionaleCollapsibleChevronBoxClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] text-[color:var(--cab-text-muted)] transition-[background-color,border-color] duration-300 motion-reduce:transition-none group-hover:border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] group-hover:bg-[var(--cab-hover)]";

export const gestionaleCollapsibleChevronBoxExpandedClass =
  "border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_92%,var(--cab-hover))]";

export const gestionaleCollapsibleChevronIconClass = `h-4 w-4 transition-transform duration-300 ${gestionaleCollapsibleEase} motion-reduce:transition-none`;

/** Trigger riga header accordion (titolo + chevron a sinistra, es. gerarchie). */
export const gestionaleCollapsibleHeaderTriggerClass =
  "group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-1 text-left touch-manipulation transition-colors duration-200 ease-out hover:bg-[var(--cab-hover)] motion-reduce:transition-none";

/** Shell collapsible header — SSOT Lavorazioni (ShellCard). */
export const gestionaleCollapsibleShellHeaderShellClass =
  "flex w-full min-w-0 items-stretch";

export const gestionaleCollapsibleShellHeaderSurfaceClass =
  "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))]";

export const gestionaleCollapsibleShellHeaderFocusClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cab-card)]";

/** Unico trigger SSOT — ShellCard Lavorazioni + form modale (nessun merge di varianti). */
export const gestionaleCollapsibleShellHeaderBtnClass =
  "group flex min-w-0 w-full flex-1 cursor-pointer self-stretch items-center gap-3 px-4 py-3 text-left touch-manipulation outline-none transition-colors duration-200 ease-out hover:bg-[var(--cab-hover)] active:bg-[var(--cab-hover)] motion-reduce:transition-none sm:min-h-[3.25rem] sm:px-5 [-webkit-tap-highlight-color:transparent]";

/** Form modale flat: niente shell — header flush su sfondo card. */
export const gestionaleCollapsibleFlatFormHeaderBtnClass =
  "w-full rounded-none bg-transparent";

/** Riga header form flat (toggle + azioni). */
export const gestionaleCollapsibleFlatFormHeaderRowClass =
  "flex w-full min-w-0 items-stretch overflow-hidden rounded-none";

/** Form modale: trigger flush nel bordo sezione — un solo button, niente wrapper bleed. */
export const gestionaleCollapsibleFormHeaderBtnClass =
  "w-full rounded-t-[var(--ds-radius-lg)] bg-transparent";

/** Riga header form con azioni (toggle + slot azioni). */
export const gestionaleCollapsibleFormHeaderRowClass =
  "flex w-full min-w-0 items-stretch overflow-hidden rounded-t-[var(--ds-radius-lg)]";

/** Compattezza header (ShellCard `compactHeader`). */
export const gestionaleCollapsibleShellHeaderBtnCompactClass =
  "min-h-10 py-2 sm:min-h-10 sm:px-4";

export const gestionaleCollapsibleShellHeaderActionsClass =
  "flex shrink-0 items-center gap-2 self-stretch px-2 sm:px-3";

export const gestionaleCollapsibleShellHeaderActionsDividerClass =
  "border-l border-[color:var(--cab-border)]";

/** Separatore header/contenuto — border solido (no inset shadow: evita flash in dark mode). */
export const gestionaleCollapsibleShellHeaderDividerClass =
  "border-b border-[color:var(--cab-border)]";

/** Raggio shell card (ShellCard / liste pagina). */
export const gestionaleCollapsibleShellCardRadiusClass = "rounded-[var(--ds-radius-xl)]";

/** Raggio header shell card — espanso: solo angoli superiori. */
export const gestionaleCollapsibleShellHeaderRadiusExpandedClass =
  "overflow-hidden rounded-t-[var(--ds-radius-xl)]";

/** Raggio header shell card — collassato: pill/card intera. */
export const gestionaleCollapsibleShellHeaderRadiusCollapsedClass =
  "overflow-hidden rounded-[var(--ds-radius-xl)]";

export function gestionaleCollapsibleShellHeaderShellRadiusClass(expanded: boolean): string {
  return expanded
    ? gestionaleCollapsibleShellHeaderRadiusExpandedClass
    : gestionaleCollapsibleShellHeaderRadiusCollapsedClass;
}

export function gestionaleCollapsibleShellHeaderBtnRadiusClass(expanded: boolean): string {
  return expanded
    ? "rounded-t-[var(--ds-radius-xl)]"
    : gestionaleCollapsibleShellCardRadiusClass;
}
