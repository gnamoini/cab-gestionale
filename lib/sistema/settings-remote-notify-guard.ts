/** Sopprime toast realtime «impostazioni aggiornate» subito dopo un salvataggio locale (burst multi-riga). */
let suppressUntil = 0;

export function suppressSettingsRemoteNotify(ms = 2800): void {
  suppressUntil = Math.max(suppressUntil, Date.now() + ms);
}

export function shouldSuppressSettingsRemoteNotify(): boolean {
  return Date.now() < suppressUntil;
}
