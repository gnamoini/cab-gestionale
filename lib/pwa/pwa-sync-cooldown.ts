import { GESTIONALE_DISPATCH_DEDUP_MS } from "@/lib/sync/gestionale-sync-dispatch";

export const PWA_SYNC_COOLDOWN_MS = GESTIONALE_DISPATCH_DEDUP_MS;

let lastPwaSyncAt = 0;

export function resetPwaSyncCooldownForTests(): void {
  lastPwaSyncAt = 0;
}

/** Cooldown condiviso tra reconnect e sync finalization. */
export function claimPwaSyncCooldown(now = Date.now()): boolean {
  if (now - lastPwaSyncAt < PWA_SYNC_COOLDOWN_MS) return false;
  lastPwaSyncAt = now;
  return true;
}
