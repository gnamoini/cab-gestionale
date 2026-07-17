"use client";

import { AdminNotificationsBell } from "@/components/dashboard/admin-notifications-bell";
import { NotificationCenterBell } from "@/components/gestionale/notification-center-bell";
import { resolveRole } from "@/lib/auth/rbac";
import { isClientInboxEligible } from "@/lib/notifications/client-inbox-eligible";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { useAuth } from "@/context/auth-context";
import { useGestionaleShellTier } from "@/context/gestionale-shell-layout-context";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

/** Campanella notifiche in header pagina (legacy inbox o v2 su shell compatta). */
export function PageHeaderNotificationsBell() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const { readsDb, isLoading: flagLoading } = useNotificationsV2Mode();
  const { isCompactShell } = useGestionaleShellTier();

  if (!user?.id) return null;

  const resolving = permsLoading || flagLoading;
  if (resolving) return null;

  if (!readsDb) {
    return <AdminNotificationsBell />;
  }

  const eligibleUser = snapshot?.role ? { ruolo: snapshot.role } : user;
  const rbacCtx = snapshot?.rbacContext;
  if (resolveRole(eligibleUser) === "guest") return null;

  const staffEligible = isStaffInboxEligible(eligibleUser, rbacCtx);
  const clientEligible = isClientInboxEligible(eligibleUser, rbacCtx);
  if (!staffEligible && !clientEligible) return null;

  // ponytail: su desktop la campanella resta in sidebar; in header solo su mobile/tablet
  if (!isCompactShell) return null;

  return <NotificationCenterBell headerTrigger layerAboveNav />;
}
