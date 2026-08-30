"use client";

import dynamic from "next/dynamic";
import { isClientInboxEligible } from "@/lib/notifications/client-inbox-eligible";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { resolveRole } from "@/lib/auth/rbac";
import { useAuth } from "@/context/auth-context";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";

const NotificationCenterBell = dynamic(
  () =>
    import("@/components/gestionale/notification-center-bell").then((m) => m.NotificationCenterBell),
  { ssr: false },
);

type NotificationCenterMountProps = {
  sidebarCollapsed?: boolean;
  /** Dentro `SidebarSessionPanel` (stile riga unificata). */
  embedded?: boolean;
  /** Sopra il drawer nav mobile (z-[110], come profilo). */
  layerAboveNav?: boolean;
  onExpandIntent?: () => void;
  /** Chiude overlay parent (sidebar); non usare sul drawer nav mobile. */
  onOpenInbox?: () => void;
};

/** Monta campanella inbox v2 per staff elegibile o portale clienti. */
export function NotificationCenterMount({
  sidebarCollapsed,
  embedded = false,
  layerAboveNav = false,
  onExpandIntent,
  onOpenInbox,
}: NotificationCenterMountProps) {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const { readsDb, isLoading: flagLoading } = useNotificationsV2Mode();

  if (!user?.id) return null;

  const eligibleUser = snapshot?.role ? { ruolo: snapshot.role } : user;
  const rbacCtx = snapshot?.rbacContext;
  const resolving = permsLoading || flagLoading;

  if (!resolving) {
    if (!readsDb) return null;
    const staffEligible = isStaffInboxEligible(eligibleUser, rbacCtx);
    const clientEligible = isClientInboxEligible(eligibleUser, rbacCtx);
    if (!staffEligible && !clientEligible) return null;
  } else if (resolveRole(eligibleUser) === "guest") {
    return null;
  }

  return (
    <NotificationCenterBell
      embedded={embedded}
      layerAboveNav={layerAboveNav}
      sidebarCollapsed={sidebarCollapsed}
      onExpandIntent={onExpandIntent}
      onOpenInbox={onOpenInbox}
    />
  );
}
