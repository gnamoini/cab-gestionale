import type { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";

/** Invalidate mirato inbox + unread — no globale. */
export function runPwaNotificationSync(qc: QueryClient): void {
  void qc.invalidateQueries({
    queryKey: QK.notificationsUnread,
    refetchType: "active",
  });
  void qc.invalidateQueries({
    queryKey: QK.notificationsInbox,
    refetchType: "active",
  });
}
