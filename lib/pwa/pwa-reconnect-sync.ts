import type { QueryClient } from "@tanstack/react-query";
import { claimPwaSyncCooldown, resetPwaSyncCooldownForTests } from "@/lib/pwa/pwa-sync-cooldown";
import { GESTIONALE_DISPATCH_DEDUP_MS } from "@/lib/sync/gestionale-sync-dispatch";
import { markDirtyForOperationalTables } from "@/lib/sync/gestionale-dirty-flush";
import { isGestionaleDirtySyncEnabled } from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import { isOperationalSessionWarmingUp } from "@/lib/sync/operational-session-warmup";
import { consumeOperationalVersionPoll } from "@/lib/sync/operational-data-version";
import { refetchActiveOperationalSnapshot } from "@/lib/sync/gestionale-snapshot-recovery";
import { QK } from "@/src/lib/react-query/query-keys";

export const PWA_RECONNECT_DEBOUNCE_MS = 2_000;
export const PWA_RECONNECT_COOLDOWN_MS = GESTIONALE_DISPATCH_DEDUP_MS;
export const PWA_OPERATIONAL_RECONNECT_TABLES = [
  "lavorazioni",
  "scheda_lavorazione",
  "magazzino_ricambi",
  "movimenti_ricambi",
  "documenti",
  "pdf_artifacts",
  "document_access_tokens",
  "log_modifiche",
] as const;

export function resetPwaReconnectSyncForTests(): void {
  resetPwaSyncCooldownForTests();
}

async function applyPwaReconnectSync(qc: QueryClient): Promise<void> {
  refetchActiveOperationalSnapshot(qc, { onlyActive: true });

  try {
    const drifted = await consumeOperationalVersionPoll();
    if (drifted.length > 0 && isGestionaleDirtySyncEnabled() && !isOperationalSessionWarmingUp()) {
      markDirtyForOperationalTables(drifted);
    }
  } catch {
    // ponytail: reconnect resta refetch silenzioso se version RPC non disponibile
  }

  void qc.invalidateQueries({
    queryKey: QK.userPermissions,
    refetchType: "active",
  });
}

/** Sync controllato alla riconnessione — refetch silenzioso; banner solo su drift verificato. */
export function runPwaReconnectSync(qc: QueryClient, opts?: { skipCooldown?: boolean }): void {
  if (!opts?.skipCooldown && !claimPwaSyncCooldown()) return;
  void applyPwaReconnectSync(qc);
}

/** Usato da sync finalization dopo cooldown già claimato. */
export function runPwaReconnectSyncWithoutCooldown(qc: QueryClient): void {
  void applyPwaReconnectSync(qc);
}
