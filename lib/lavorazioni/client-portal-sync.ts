/** Evento globale: forza reload foto/documenti/schede locali nel portale clienti. */
export const CLIENT_PORTAL_REFRESH_EVENT = "gestionale-client-lavorazioni-refresh";

export function dispatchClientPortalRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLIENT_PORTAL_REFRESH_EVENT));
}
