"use client";

import { LoadingSpinner } from "@/components/design-system/loading";
import { NotificationBellIcon } from "@/components/design-system";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import {
  NOTIFICATION_OPT_IN_BENEFITS,
  notificationOptInAcceptLabel,
  notificationOptInContextLabel,
  notificationOptInDeclineLabel,
  notificationOptInDeniedMessage,
  notificationOptInDescription,
  notificationOptInSuccessMessage,
  type NotificationOptInMode,
} from "@/lib/notifications/notification-opt-in-copy";
import { dsSystemBannerContextChip, dsSystemBannerGhostBtn, dsSystemBannerIconWrap, dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";
import { useRbac } from "@/src/hooks/use-rbac";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useNotificationOptIn } from "@/src/hooks/use-notification-opt-in";

function NotificationOptInBannerBody({
  mode,
  busy,
  onEnable,
  onDecline,
}: {
  mode: NotificationOptInMode;
  busy?: boolean;
  onEnable: () => void;
  onDecline: () => void;
}) {
  return (
    <SystemBannerShell ariaLabel="Attiva notifiche gestionale">
      <SystemBannerLayout
        media={
          <div className={dsSystemBannerIconWrap} aria-hidden>
            <NotificationBellIcon />
          </div>
        }
        title="Attiva le notifiche"
        titleExtra={<span className={dsSystemBannerContextChip}>{notificationOptInContextLabel(mode)}</span>}
        description={notificationOptInDescription(mode)}
        tags={NOTIFICATION_OPT_IN_BENEFITS}
        tagsAriaLabel="Tipi di avviso"
        onDismiss={onDecline}
        dismissLabel="Rifiuta notifiche"
        actions={
          <>
            <button type="button" disabled={busy} className={dsSystemBannerPrimaryBtn} onClick={onEnable}>
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" label="Attivazione notifiche" className="mt-0" />
                  Attivazione…
                </span>
              ) : (
                notificationOptInAcceptLabel()
              )}
            </button>
            <button type="button" className={dsSystemBannerGhostBtn} onClick={onDecline}>
              {notificationOptInDeclineLabel()}
            </button>
          </>
        }
      />
    </SystemBannerShell>
  );
}

export function NotificationOptInBanner() {
  const rbac = useRbac();
  const gestToast = useGestionaleToast();
  const authReady = rbac.canReadPage("dashboard") && !rbac.isLoading;
  const optIn = useNotificationOptIn(authReady);

  const handleDecline = () => {
    optIn.declineOptIn();
  };

  const handleEnable = async () => {
    const result = await optIn.enableOptIn();
    if (result === "granted") {
      gestToast.success(notificationOptInSuccessMessage());
      return;
    }
    if (result === "denied") {
      gestToast.validation(notificationOptInDeniedMessage(optIn.mode));
    }
    if (result === "error") {
      gestToast.error("Impossibile attivare le notifiche. Riprova tra poco.");
    }
  };

  if (!optIn.bannerVisible) return null;

  return (
    <NotificationOptInBannerBody
      mode={optIn.mode}
      busy={optIn.busy}
      onEnable={() => void handleEnable()}
      onDecline={handleDecline}
    />
  );
}
