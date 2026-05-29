/** True when `href` is already the active section (exact route or direct child path). */
export function isNavTargetCurrent(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

export const ROUTE_LOADING_FAILSAFE_MS = 5_000;

export const ROUTE_TRANSITION_CANCEL_EVENT = "cab:route-transition-cancel";

/** Reset overlay di navigazione (es. click annullato da guard modifiche non salvate). */
export function cancelRouteTransition(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ROUTE_TRANSITION_CANCEL_EVENT));
}

/**
 * Avvia il loading route dopo i listener capture (guard unsaved changes, ecc.).
 * Evita overlay bloccato se un handler fa preventDefault nello stesso click.
 */
export function scheduleRouteTransitionBegin(event: { defaultPrevented: boolean }, begin: () => void): void {
  queueMicrotask(() => {
    if (event.defaultPrevented) return;
    begin();
  });
}
