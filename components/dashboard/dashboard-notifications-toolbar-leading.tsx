"use client";

import { AdminNotificationsBell } from "@/components/dashboard/admin-notifications-bell";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";

/** Campanella legacy su dashboard — solo quando inbox v2 non legge da DB (flag off). */
export function DashboardNotificationsToolbarLeading() {
  const { readsDb, isLoading } = useNotificationsV2Mode();
  if (isLoading || readsDb) return null;
  return <AdminNotificationsBell />;
}
