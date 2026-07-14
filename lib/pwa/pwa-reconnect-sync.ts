import type { QueryClient } from "@tanstack/react-query";
import { GESTIONALE_DISPATCH_DEDUP_MS } from "@/lib/sync/gestionale-sync-dispatch";
import { dispatchGestionaleAction } from "@/lib/sync/gestionale-sync-dispatch";
import { refetchActiveOperationalSnapshot } from "@/lib/sync/gestionale-snapshot-recovery";
import { claimPwaSyncCooldown, resetPwaSyncCooldownForTests } from "@/lib/pwa/pwa-sync-cooldown";
import { QK } from "@/src/lib/react-query/query-keys";

export const PWA_RECONNECT_DEBOUNCE_MS = 2_000;
export const PWA_RECONNECT_COOLDOWN_MS = GESTIONALE_DISPATCH_DEDUP_MS;

/** Tabelle operative per reconnect — allineate a OPERATIONAL_DOMAINS + log. */
export const PWA_OPERATIONAL_RECONNECT_TABLES = [
  "lavorazioni",
  "scheda_lavorazione",
  "magazzino_ricambi",
  "movimenti_ricambi",
  "documenti",
  "lavorazione_documents",
  "log_modifiche",
] as const;

export function resetPwaReconnectSyncForTests(): void {
  resetPwaSyncCooldownForTests();
}

function applyPwaReconnectSync(qc: QueryClient): void {
  refetchActiveOperationalSnapshot(qc, { onlyActive: true });

  dispatchGestionaleAction(qc, [...PWA_OPERATIONAL_RECONNECT_TABLES], {
    source: "reconnect",
  });

  void qc.invalidateQueries({
    queryKey: QK.userPermissions,
    refetchType: "active",
  });
}

/** Sync controllato alla riconnessione — delega ai layer esistenti, no invalidazione globale. */
export function runPwaReconnectSync(qc: QueryClient, opts?: { skipCooldown?: boolean }): void {
  if (!opts?.skipCooldown && !claimPwaSyncCooldown()) return;
  applyPwaReconnectSync(qc);
}

/** Usato da sync finalization dopo cooldown già claimato. */
export function runPwaReconnectSyncWithoutCooldown(qc: QueryClient): void {
  applyPwaReconnectSync(qc);
}
