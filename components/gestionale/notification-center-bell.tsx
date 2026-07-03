"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  LogEntry,
  NotificationBellIcon,
  NotificationCountBadge,
  NotificationRowDismiss,
  Tooltip,
} from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogList,
  gestionaleLogDrawerFooterClass,
  gestionaleLogDrawerPanelStackClass,
  gestionaleLogDrawerScrollInsetClass,
  gestionaleLogPanelAsideClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import {
  inboxNotificationHref,
  toInboxNotificationLogViewModel,
} from "@/lib/notifications/inbox-notification-message";
import type { InboxNotificationRow } from "@/lib/notifications/notification-types";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { buildAdminDashboardTestNotification } from "@/lib/notifications/admin-dashboard-notifications";
import {
  getDesktopNotificationPermissionState,
  requestDesktopNotificationPermissionInteractive,
  type DesktopNotificationPermissionState,
} from "@/lib/lavorazioni/desktop-notifications";
import { useAuth } from "@/context/auth-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsBtnGhost, dsFocus } from "@/lib/ui/design-system";
import {
  dsNotificationDesktopStatusActive,
  dsNotificationDesktopStatusDotActive,
  dsNotificationDesktopStatusDotInactive,
  dsNotificationDesktopStatusInactive,
} from "@/lib/ui/notification-ui";
import { SidebarNavRow, SidebarSessionExpandChevron } from "@/components/gestionale/sidebar-nav-row";
import { useNotificationCenter } from "@/src/hooks/gestionale/use-notification-center";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";

const notificationFooterBtnClass = `${dsBtnGhost} min-h-[2rem] shrink-0`;

function NotificationsDesktopStatusBadge({
  permissionState,
  onPermissionChange,
}: {
  permissionState: DesktopNotificationPermissionState;
  onPermissionChange: () => void;
}) {
  const { user } = useAuth();
  const gestToast = useGestionaleToast();
  const { mode } = useNotificationsV2Mode();
  const desktopActive = permissionState === "granted";
  const statusLabel = desktopActive ? "ATTIVE" : "NON ATTIVE";
  const statusClass = desktopActive ? dsNotificationDesktopStatusActive : dsNotificationDesktopStatusInactive;
  const dotClass = desktopActive ? dsNotificationDesktopStatusDotActive : dsNotificationDesktopStatusDotInactive;

  const handleTest = async () => {
    const userId = user?.id;
    if (!userId) return;
    const { added, desktop } = await publishNotification(
      userId,
      buildAdminDashboardTestNotification(),
      mode,
    );
    if (added) onPermissionChange();
    if (desktop) {
      gestToast.success("Notifica di test inviata (campanella e desktop).");
    } else {
      gestToast.validation("Test in campanella. Abilita le notifiche desktop per il popup di sistema.");
    }
  };

  const statusTooltip = desktopActive
    ? "Notifiche desktop attive.\nClic per inviare una notifica di prova."
    : "Notifiche desktop non attive.\nClic per una prova in campanella.";
  const statusAriaLabel = desktopActive
    ? "Notifiche desktop attive. Invia notifica di prova"
    : "Notifiche desktop non attive. Invia notifica di prova in campanella";

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Tooltip content={statusTooltip} multiline side="bottom">
        <button
          type="button"
          className={`${statusClass} ${dsFocus}`}
          disabled={!user?.id}
          onClick={() => void handleTest()}
          aria-label={statusAriaLabel}
        >
          <span className={dotClass} aria-hidden />
          {statusLabel}
        </button>
      </Tooltip>
    </div>
  );
}

function NotificationsPanelFooter({
  permissionState,
  onPermissionChange,
  notificationCount,
  onDismissAll,
  isDismissingAll,
}: {
  permissionState: DesktopNotificationPermissionState;
  onPermissionChange: () => void;
  notificationCount: number;
  onDismissAll: () => void | Promise<void>;
  isDismissingAll: boolean;
}) {
  const gestToast = useGestionaleToast();
  const canEnable = permissionState === "default" || permissionState === "denied";
  const showDeniedHint = permissionState === "denied";
  const showDismissAll = notificationCount > 0;

  if (!canEnable && !showDeniedHint && !showDismissAll) return null;

  const handleEnable = async () => {
    const result = await requestDesktopNotificationPermissionInteractive();
    onPermissionChange();
    if (result === "granted") {
      gestToast.success("Notifiche desktop attivate.");
      return;
    }
    if (result === "denied") {
      gestToast.validation(
        "Notifiche bloccate dal browser. Apri le impostazioni del sito (lucchetto) e consenti le notifiche.",
      );
    }
  };

  const handleDismissAll = async () => {
    await onDismissAll();
  };

  return (
    <footer className={gestionaleLogDrawerFooterClass}>
      {canEnable || showDismissAll ? (
        <div
          className={`flex-safe-row min-w-0 max-w-full flex-nowrap items-center gap-x-2 gap-y-1.5 ${
            canEnable ? "justify-between" : "justify-end"
          }`}
        >
          {canEnable ? (
            <button type="button" className={notificationFooterBtnClass} onClick={() => void handleEnable()}>
              Abilita notifiche desktop
            </button>
          ) : null}
          {showDismissAll ? (
            <button
              type="button"
              className={notificationFooterBtnClass}
              disabled={isDismissingAll}
              onClick={() => void handleDismissAll()}
            >
              {isDismissingAll ? "Eliminazione…" : "Elimina tutte"}
            </button>
          ) : null}
        </div>
      ) : null}
      {showDeniedHint ? (
        <p className="text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
          Consenti le notifiche dal lucchetto del browser.
        </p>
      ) : null}
    </footer>
  );
}

function InboxNotificationMessageRow({
  row,
  onNavigate,
  onDismiss,
}: {
  row: InboxNotificationRow;
  onNavigate: () => void;
  onDismiss: () => void;
}) {
  const vm = toInboxNotificationLogViewModel(row);
  const navigable = Boolean(inboxNotificationHref(row));

  return (
    <div className="min-w-0">
      <LogEntry
        vm={vm}
        variant="inbox"
        onClick={navigable ? onNavigate : undefined}
        trailing={<NotificationRowDismiss embedded onDismiss={onDismiss} />}
      />
    </div>
  );
}

type NotificationCenterBellProps = {
  sidebarCollapsed?: boolean;
  onExpandIntent?: () => void;
  onOpenInbox?: () => void;
  /** Riga nel blocco sessione unificato (sidebar/drawer). */
  embedded?: boolean;
};

export function NotificationCenterBell({
  sidebarCollapsed = false,
  onExpandIntent,
  onOpenInbox,
  embedded = false,
}: NotificationCenterBellProps) {
  const gestToast = useGestionaleToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [desktopPermissionState, setDesktopPermissionState] = useState(() =>
    getDesktopNotificationPermissionState(),
  );
  const {
    notifications,
    unreadCount,
    enabled,
    isLoading,
    dismissNotification,
    dismissAllNotifications,
    isDismissingAll,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useNotificationCenter(open);

  const close = useCallback(() => setOpen(false), []);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const toggle = useCallback(() => {
    if (!openRef.current) onOpenInbox?.();
    setOpen((v) => !v);
  }, [onOpenInbox]);

  useEffect(() => {
    if (!open) return;
    setDesktopPermissionState(getDesktopNotificationPermissionState());
  }, [open]);

  const refreshDesktopPermission = useCallback(() => {
    setDesktopPermissionState(getDesktopNotificationPermissionState());
  }, []);

  const handleDismissAll = useCallback(async () => {
    const removed = await dismissAllNotifications();
    if (removed > 0) {
      gestToast.success(removed === 1 ? "Notifica eliminata." : `${removed} notifiche eliminate.`);
    }
  }, [dismissAllNotifications, gestToast]);

  const onNavigate = useCallback(
    (row: InboxNotificationRow) => {
      close();
      const href = inboxNotificationHref(row);
      if (href) router.push(href);
    },
    [close, router],
  );

  const prevUnreadRef = useRef<number | null>(null);
  const [bellArrive, setBellArrive] = useState(false);

  useEffect(() => {
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = unreadCount;
      return;
    }
    if (unreadCount > prevUnreadRef.current) {
      setBellArrive(true);
      const timer = window.setTimeout(() => setBellArrive(false), 700);
      prevUnreadRef.current = unreadCount;
      return () => window.clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  if ((isLoading || !enabled) && !open) return null;

  const drawerTitle = "Notifiche";

  const ariaLabel = unreadCount > 0 ? `Notifiche (${unreadCount} nuove)` : "Notifiche";

  const collapsed = embedded && sidebarCollapsed;

  const navPointerIntentProps = collapsed
    ? {
        onPointerEnter: () => onExpandIntent?.(),
      }
    : {};

  const bellIcon = (
    <span
      className={`cab-sidebar-notification-bell relative flex h-full w-full items-center justify-center overflow-visible ${
        unreadCount > 0 && collapsed ? "cab-sidebar-notification-bell--unread" : ""
      } ${bellArrive ? "cab-notification-bell-icon--arrive" : ""}`.trim()}
    >
      <NotificationBellIcon variant="rail" />
      {unreadCount > 0 && collapsed ? (
        <NotificationCountBadge count={unreadCount} variant="rail" />
      ) : null}
    </span>
  );

  const trailingExpanded =
    !collapsed &&
    (unreadCount > 0 && !open ? (
      <NotificationCountBadge count={unreadCount} variant="sidebarTrailing" />
    ) : (
      <SidebarSessionExpandChevron active={open} />
    ));

  const triggerButton = (
    <SidebarNavRow
      as="button"
      onClick={toggle}
      collapsed={collapsed}
      open={open}
      railTooltip={unreadCount > 0 ? `Notifiche (${unreadCount})` : "Notifiche"}
      className={`overflow-visible ${bellArrive ? "cab-notification-bell--arrive" : ""}`.trim()}
      icon={bellIcon}
      label="Notifiche"
      trailing={trailingExpanded || undefined}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      data-testid="smoke-notifications"
      {...navPointerIntentProps}
    />
  );

  const trigger = triggerButton;

  return (
    <>
      {embedded ? trigger : <div className="cab-sidebar-notifications relative shrink-0 px-1 pb-2">{trigger}</div>}

      <Drawer
        open={open}
        onClose={close}
        title={drawerTitle}
        titleAddon={
          <NotificationsDesktopStatusBadge
            permissionState={desktopPermissionState}
            onPermissionChange={refreshDesktopPermission}
          />
        }
        ariaLabel="Centro notifiche"
        asideClassName={gestionaleLogPanelAsideClass}
      >
        <div className={gestionaleLogDrawerPanelStackClass}>
          <div className={`${gestionaleLogScrollEmbeddedClass} ${gestionaleLogDrawerScrollInsetClass} min-h-0 min-w-0 flex-1`}>
            {notifications.length === 0 ? (
              <GestionaleLogEmpty message="Nessuna notifica al momento." />
            ) : (
              <GestionaleLogList>
                {notifications.map((row) => (
                  <li key={row.id} className="list-none">
                    <InboxNotificationMessageRow
                      row={row}
                      onNavigate={() => onNavigate(row)}
                      onDismiss={() => void dismissNotification(row)}
                    />
                  </li>
                ))}
              </GestionaleLogList>
            )}
            {hasMore ? (
              <div className="py-2 text-center">
                <button
                  type="button"
                  className={dsBtnGhost}
                  disabled={isLoadingMore}
                  onClick={loadMore}
                >
                  {isLoadingMore ? "Caricamento…" : "Carica altre"}
                </button>
              </div>
            ) : null}
          </div>
          <NotificationsPanelFooter
            permissionState={desktopPermissionState}
            onPermissionChange={refreshDesktopPermission}
            notificationCount={notifications.length}
            onDismissAll={handleDismissAll}
            isDismissingAll={isDismissingAll}
          />
        </div>
      </Drawer>
    </>
  );
}
