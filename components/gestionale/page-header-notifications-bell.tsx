"use client";

import { AdminNotificationsBell } from "@/components/dashboard/admin-notifications-bell";
import { NotificationCenterBell } from "@/components/gestionale/notification-center-bell";
import { resolveRole } from "@/lib/auth/rbac";
import { useAuth } from "@/context/auth-context";
import { useGestionaleShellTier } from "@/context/gestionale-shell-layout-context";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useInboxEligible } from "@/src/hooks/gestionale/use-inbox-eligible";

/** Campanella notifiche in header pagina (legacy inbox o v2 su shell compatta). */
export function PageHeaderNotificationsBell() {
  const { user } = useAuth();
  const { readsDb, isLoading: flagLoading } = useNotificationsV2Mode();
  const { eligible, isLoading: eligibilityLoading } = useInboxEligible();
  const { isCompactShell } = useGestionaleShellTier();

  if (!user?.id) return null;

  const resolving = flagLoading || eligibilityLoading;
  if (resolving) return null;

  if (!readsDb) {
    return <AdminNotificationsBell />;
  }

  if (resolveRole(user) === "guest") return null;
  if (!eligible) return null;

  // ponytail: su desktop la campanella resta in sidebar; in header solo su mobile/tablet
  if (!isCompactShell) return null;

  return <NotificationCenterBell headerTrigger layerAboveNav />;
}
