"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  LogEntry,
  NotificationBellTrigger,
  NotificationOpenLink,
  NotificationRowShell,
} from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogList,
  gestionaleLogDrawerFooterClass,
  gestionaleLogDrawerPanelFillClass,
  gestionaleLogDrawerScrollInsetClass,
  gestionaleLogPanelAsideClass,
  gestionaleLogScrollClass,
} from "@/components/gestionale/gestionale-log-ui";
import {
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationFatturazioneHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
} from "@/lib/lavorazioni/admin-notifications";
import {
  buildAdminDashboardTestNotification,
  isAdminDashboardTestNotification,
  isDipendentiPresenzeReminderNotification,
  isFattureScaduteDigestNotification,
  isLavorazioneCompletataNotification,
  isLavorazioneDashboardNotification,
  isMagazzinoDashboardNotification,
  notificationStoreKey,
  type AdminDashboardNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import {
  getAdminNotificationOpenLinkLabel,
  toAdminNotificationLogViewModel,
} from "@/lib/notifications/admin-dashboard-notification-message";
import { publishAdminDashboardNotification } from "@/lib/notifications/admin-dashboard-desktop";
import { dispatchAdminDashboardTestSystemNotification } from "@/lib/notifications/admin-dashboard-test-system";
import {
  formatDesktopNotificationPermissionStatusLabel,
  getDesktopNotificationPermissionState,
  type DesktopNotificationPermissionState,
} from "@/lib/lavorazioni/desktop-notifications";
import { shouldPreferPwaPushOverDesktopPrompt } from "@/lib/pwa/push-permission-flow";
import { usePwaPushOptIn } from "@/src/hooks/use-pwa-push-opt-in";
import { useNotificationOptIn } from "@/src/hooks/use-notification-opt-in";
import { notificationOptInDeniedMessage, notificationOptInSuccessMessage } from "@/lib/notifications/notification-opt-in-copy";
import { useAuth } from "@/context/auth-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsBtnGhost } from "@/lib/ui/design-system";
import { useAdminNotificationStore } from "@/src/hooks/gestionale/use-admin-notification-store";

function NotificationsPanelFooter({
  permissionState,
  onPermissionChange,
  unreadCount,
  readCount,
  onMarkAllRead,
  onRemoveRead,
}: {
  permissionState: DesktopNotificationPermissionState;
  onPermissionChange: () => void;
  unreadCount: number;
  readCount: number;
  onMarkAllRead: () => void;
  onRemoveRead: () => void;
}) {
  const { user } = useAuth();
  const gestToast = useGestionaleToast();
  const optIn = useNotificationOptIn();
  const pushOptIn = usePwaPushOptIn();
  const preferPush = shouldPreferPwaPushOverDesktopPrompt();
  const pushActive = pushOptIn.permissionState === "granted";
  const statusLabel = formatDesktopNotificationPermissionStatusLabel(permissionState);
  const canEnable = optIn.menuEnableVisible;
  const notificationsActive = preferPush ? pushActive : permissionState === "granted";
  const canSendTest = notificationsActive && Boolean(user?.id);
  const desktopActive = permissionState === "granted";

  const handleEnable = async () => {
    const result = await optIn.enableOptIn();
    onPermissionChange();
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

  const handleTest = async () => {
    const userId = user?.id;
    if (!userId) return;
    const testNotification = buildAdminDashboardTestNotification();
    const { added, desktop } = await publishAdminDashboardNotification(userId, testNotification);
    if (added) onPermissionChange();

    let system = desktop;
    if (!system) {
      system = await dispatchAdminDashboardTestSystemNotification({
        notification: testNotification,
        pushActive,
      });
    }

    if (system) {
      gestToast.success(
        preferPush
          ? "Notifica di test inviata (campanella e dispositivo)."
          : "Notifica di test inviata (campanella e desktop).",
      );
      return;
    }
    if (added) {
      gestToast.validation(
        preferPush
          ? "Test in campanella. Abilita le notifiche push dal menu o dalle impostazioni del telefono."
          : "Test in campanella. Abilita le notifiche desktop per il popup di sistema.",
      );
    }
  };

  return (
    <footer className={gestionaleLogDrawerFooterClass}>
      <div className="flex-safe-row min-w-0 max-w-full flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 sm:flex-wrap">
        <span className="text-xs text-[color:var(--cab-text-muted)]">
          Desktop{" "}
          <span
            className={
              desktopActive
                ? "font-medium text-[color:var(--cab-text)]"
                : "font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_75%,var(--cab-text))]"
            }
          >
            {statusLabel}
          </span>
        </span>
        <div className="flex-safe-row min-w-0 max-w-full flex-nowrap items-center gap-1 sm:flex-wrap">
          {canEnable ? (
            <button type="button" className={dsBtnGhost} onClick={() => void handleEnable()}>
              Abilita notifiche
            </button>
          ) : null}
          {canSendTest ? (
            <button type="button" className={dsBtnGhost} onClick={() => void handleTest()}>
              Test
            </button>
          ) : null}
        </div>
      </div>
      {permissionState === "denied" ? (
        <p className="text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
          Consenti le notifiche dal lucchetto del browser.
        </p>
      ) : null}
      <div className="flex items-center gap-2 border-t border-[color:color-mix(in_srgb,var(--cab-border)_65%,transparent)] pt-2">
        <button
          type="button"
          className={`${dsBtnGhost} min-h-[2rem] min-w-0 flex-1 sm:flex-none`}
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
        >
          Segna tutte lette
        </button>
        <span className="hidden h-4 w-px shrink-0 bg-[color:var(--cab-border)] sm:block" aria-hidden />
        <button
          type="button"
          className={`${dsBtnGhost} min-h-[2rem] min-w-0 flex-1 sm:flex-none`}
          disabled={readCount === 0}
          onClick={onRemoveRead}
        >
          Elimina lette
        </button>
      </div>
    </footer>
  );
}

function AdminNotificationMessageRow({
  row,
  unread,
  onMarkRead,
  onNavigate,
  onDismiss,
}: {
  row: AdminDashboardNotification;
  unread: boolean;
  onMarkRead: () => void;
  onNavigate: () => void;
  onDismiss: () => void;
}) {
  const openLabel = getAdminNotificationOpenLinkLabel(row);
  const vm = toAdminNotificationLogViewModel(row);

  return (
    <div className={`min-w-0 ${unread ? "" : "opacity-80"}`}>
      <NotificationRowShell onDismiss={onDismiss}>
        <LogEntry
          vm={vm}
          onClick={unread ? onMarkRead : undefined}
          title={unread ? "Segna come letta" : undefined}
        />
      </NotificationRowShell>
      {openLabel ? (
        <div className="-mt-1 mb-1 px-3">
          <NotificationOpenLink label={openLabel} onOpen={onNavigate} />
        </div>
      ) : null}
    </div>
  );
}

export function AdminNotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [desktopPermissionState, setDesktopPermissionState] = useState(() =>
    getDesktopNotificationPermissionState(),
  );
  const {
    notifications,
    unreadCount,
    readCount,
    enabled,
    permLoading,
    markAllRead,
    markNotificationRead,
    dismissNotification,
    removeReadNotifications,
    isUnread,
  } = useAdminNotificationStore();

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

   
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setDesktopPermissionState(getDesktopNotificationPermissionState());
  }, [open]);

  const refreshDesktopPermission = useCallback(() => {
    setDesktopPermissionState(getDesktopNotificationPermissionState());
  }, []);

  const onNavigate = useCallback(
    (row: AdminDashboardNotification) => {
      close();
      if (isAdminDashboardTestNotification(row)) return;
      if (isLavorazioneDashboardNotification(row) || isLavorazioneCompletataNotification(row)) {
        router.push(buildAdminNotificationLavorazioneHref(row.lavorazioneId));
        return;
      }
      if (isMagazzinoDashboardNotification(row)) {
        router.push(buildAdminNotificationMagazzinoHref(row.ricambioId));
        return;
      }
      if (isFattureScaduteDigestNotification(row)) {
        router.push(buildAdminNotificationFatturazioneHref());
        return;
      }
      if (isDipendentiPresenzeReminderNotification(row)) {
        router.push(buildAdminNotificationDipendentiHref());
      }
    },
    [close, router],
  );

  const handleMarkRead = useCallback(
    (row: AdminDashboardNotification) => {
      markNotificationRead(row);
    },
    [markNotificationRead],
  );

  const handleDismiss = useCallback(
    (row: AdminDashboardNotification) => {
      dismissNotification(row);
    },
    [dismissNotification],
  );

  if ((permLoading || !enabled) && !open) return null;

  const drawerTitle =
    unreadCount > 0
      ? `Notifiche (${unreadCount} non ${unreadCount === 1 ? "letta" : "lette"})`
      : "Notifiche";

  return (
    <>
      <div className="relative shrink-0">
        <NotificationBellTrigger
          count={unreadCount}
          active={unreadCount > 0}
          activeTone="info"
          ariaLabel={unreadCount > 0 ? `Notifiche (${unreadCount} non lette)` : "Notifiche"}
          ariaExpanded={open}
          onClick={toggle}
        />
      </div>

      <Drawer
        open={open}
        onClose={close}
        title={drawerTitle}
        ariaLabel="Notifiche dashboard"
        asideClassName={gestionaleLogPanelAsideClass}
        contentFill
        side="left"
      >
        <div className={gestionaleLogDrawerPanelFillClass}>
          <div className={`${gestionaleLogScrollClass} ${gestionaleLogDrawerScrollInsetClass} min-h-0 min-w-0 flex-1`}>
            {notifications.length === 0 ? (
              <GestionaleLogEmpty message="Nessuna notifica al momento." />
            ) : (
              <GestionaleLogList>
                {notifications.map((row) => (
                  <li key={notificationStoreKey(row)} className="list-none">
                    <AdminNotificationMessageRow
                      row={row}
                      unread={isUnread(row)}
                      onMarkRead={() => handleMarkRead(row)}
                      onNavigate={() => onNavigate(row)}
                      onDismiss={() => handleDismiss(row)}
                    />
                  </li>
                ))}
              </GestionaleLogList>
            )}
          </div>
          <NotificationsPanelFooter
            permissionState={desktopPermissionState}
            onPermissionChange={refreshDesktopPermission}
            unreadCount={unreadCount}
            readCount={readCount}
            onMarkAllRead={markAllRead}
            onRemoveRead={removeReadNotifications}
          />
        </div>
      </Drawer>
    </>
  );
}
