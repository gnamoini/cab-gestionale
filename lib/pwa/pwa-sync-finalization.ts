import type { QueryClient } from "@tanstack/react-query";
import { runPwaNotificationSync } from "@/lib/pwa/pwa-notification-sync";

/** Resume visibility — solo notifiche; version check via GestionaleResumeBridge. */
export function runPwaSyncFinalization(qc: QueryClient): void {
  runPwaNotificationSync(qc);
}
