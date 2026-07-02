"use client";

import { NotificationCenterBell } from "@/components/gestionale/notification-center-bell";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { useAuth } from "@/context/auth-context";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";

type NotificationCenterMountProps = {
  sidebarCollapsed?: boolean;
  /** Dentro `SidebarSessionPanel` (stile riga unificata). */
  embedded?: boolean;
  onExpandIntent?: () => void;
  /** Chiude il drawer nav mobile quando si apre l'inbox notifiche. */
  onOpenInbox?: () => void;
};

/** Monta campanella inbox v2 solo per staff elegibile e flag attivo. */
export function NotificationCenterMount({
  sidebarCollapsed,
  embedded = false,
  onExpandIntent,
  onOpenInbox,
}: NotificationCenterMountProps) {
  const { user } = useAuth();
  const { snapshot, isLoading } = useEffectivePermissions();
  const { readsDb, isLoading: flagLoading } = useNotificationsV2Mode();

  if (flagLoading || isLoading || !readsDb || !user?.id) return null;

  const eligible = isStaffInboxEligible(
    snapshot?.role ? { ruolo: snapshot.role } : user,
    snapshot?.rbacContext,
  );
  if (!eligible) return null;

  return (
    <NotificationCenterBell
      embedded={embedded}
      sidebarCollapsed={sidebarCollapsed}
      onExpandIntent={onExpandIntent}
      onOpenInbox={onOpenInbox}
    />
  );
}
