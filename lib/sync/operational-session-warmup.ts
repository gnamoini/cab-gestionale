"use client";

import { consumeOperationalVersionPoll } from "@/lib/sync/operational-data-version";

/** ponytail: copre connect RT + waterfall query iniziali; upgrade: legare a dataUpdatedAt query attive. */
export const OPERATIONAL_SESSION_WARMUP_MS = 12_000;

let warmupEndsAt = 0;
let warmupFinalizeTimer: ReturnType<typeof setTimeout> | null = null;

export function beginOperationalSessionWarmup(now = Date.now()): void {
  warmupEndsAt = now + OPERATIONAL_SESSION_WARMUP_MS;
  if (warmupFinalizeTimer) clearTimeout(warmupFinalizeTimer);
  warmupFinalizeTimer = setTimeout(() => {
    warmupFinalizeTimer = null;
    void finalizeOperationalSessionWarmup();
  }, OPERATIONAL_SESSION_WARMUP_MS);
}

/** Allinea baseline versioni a fine warmup — evita dirty spurio dal primo poll post-load. */
export async function finalizeOperationalSessionWarmup(): Promise<void> {
  if (typeof window === "undefined") {
    warmupEndsAt = 0;
    return;
  }
  try {
    await consumeOperationalVersionPoll();
  } catch {
    // ponytail: RPC assente — chiudi warmup comunque
  } finally {
    warmupEndsAt = 0;
  }
}

export function isOperationalSessionWarmingUp(now = Date.now()): boolean {
  return now < warmupEndsAt;
}

export function resetOperationalSessionWarmupForTests(): void {
  warmupEndsAt = 0;
  if (warmupFinalizeTimer) {
    clearTimeout(warmupFinalizeTimer);
    warmupFinalizeTimer = null;
  }
}
