/** Pill label/style helpers — no dipendenze global-table (safe per chunk dashboard/shell). */

export function prioritaLabel(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/** Classi layout pill tabella (colori da inline style). */
export function statoPillShellClass(): string {
  return "relative inline-flex w-full min-w-0 max-w-full items-center overflow-hidden rounded-lg border border-black/10 shadow-sm shadow-black/15 transition-[filter,box-shadow] duration-200 ease-out hover:shadow-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] dark:border-white/10";
}
