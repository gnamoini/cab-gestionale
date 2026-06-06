/** Staging/soak: forza polling fallback senza Realtime (`NEXT_PUBLIC_GESTIONALE_FORCE_POLL=1`). */
export function isGestionaleForcePollEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GESTIONALE_FORCE_POLL === "1";
}
