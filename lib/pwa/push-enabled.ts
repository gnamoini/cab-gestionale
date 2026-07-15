/** Esplicito `PWA_PUSH_ENABLED` — `null` se non impostato. */
export function resolvePwaPushFlagExplicit(): boolean | null {
  const raw = process.env.PWA_PUSH_ENABLED?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return null;
}

/** Client/build: abilita push se flag esplicito o chiave VAPID pubblica presente. */
export function resolvePwaPushClientEnabled(): boolean {
  const explicit = resolvePwaPushFlagExplicit();
  if (explicit !== null) return explicit;
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());
}

/** Server delivery: abilita invio se flag esplicito o coppia VAPID completa. */
export function resolvePwaPushServerEnabled(hasFullVapid: boolean): boolean {
  const explicit = resolvePwaPushFlagExplicit();
  if (explicit !== null) return explicit;
  return hasFullVapid;
}
