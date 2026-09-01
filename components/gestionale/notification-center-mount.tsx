"use client";

import dynamic from "next/dynamic";
import { resolveRole } from "@/lib/auth/rbac";
import { useAuth } from "@/context/auth-context";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useInboxEligible } from "@/src/hooks/gestionale/use-inbox-eligible";

const NotificationCenterBell = dynamic(
  () =>
    import("@/components/gestionale/notification-center-bell").then((m) => m.NotificationCenterBell),
  { ssr: false },
);

type NotificationCenterMountProps = {
  sidebarCollapsed?: boolean;
  embedded?: boolean;
  layerAboveNav?: boolean;
  onExpandIntent?: () => void;
  onOpenInbox?: () => void;
};

/** Monta campanella inbox v2 quando RPC notification_inbox_eligible() è true. */
export function NotificationCenterMount({
  sidebarCollapsed,
  embedded = false,
  layerAboveNav = false,
  onExpandIntent,
  onOpenInbox,
}: NotificationCenterMountProps) {
  const { user } = useAuth();
  const { readsDb, isLoading: flagLoading } = useNotificationsV2Mode();
  const { eligible, isLoading: eligibilityLoading } = useInboxEligible();

  if (!user?.id) return null;

  const resolving = flagLoading || eligibilityLoading;

  if (!resolving) {
    if (!readsDb || !eligible) return null;
  } else if (resolveRole(user) === "guest") {
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
