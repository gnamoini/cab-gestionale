import type { QueryClient } from "@tanstack/react-query";
import { claimPwaSyncCooldown } from "@/lib/pwa/pwa-sync-cooldown";
import { runPwaNotificationSync } from "@/lib/pwa/pwa-notification-sync";
import { runPwaReconnectSyncWithoutCooldown } from "@/lib/pwa/pwa-reconnect-sync";

/** Resume / push-open / visibility — dati visibili + notifiche. Nessun sync continuo. */
export function runPwaSyncFinalization(qc: QueryClient): void {
  if (!claimPwaSyncCooldown()) return;
  runPwaReconnectSyncWithoutCooldown(qc);
  runPwaNotificationSync(qc);
}
