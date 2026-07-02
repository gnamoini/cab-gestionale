"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  LogEntry,
  NotificationBellIcon,
  NotificationCountBadge,
  NotificationOpenLink,
  NotificationRowShell,
  Tooltip,
} from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogPanelAsideClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import {
  getInboxNotificationOpenLinkLabel,
  inboxNotificationHref,
  toInboxNotificationLogViewModel,
} from "@/lib/notifications/inbox-notification-message";
import type { InboxNotificationRow } from "@/lib/notifications/notification-types";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { buildAdminDashboardTestNotification } from "@/lib/notifications/admin-dashboard-notifications";
import {
  formatDesktopNotificationPermissionStatusLabel,
  getDesktopNotificationPermissionState,
  requestDesktopNotificationPermissionInteractive,
  type DesktopNotificationPermissionState,
} from "@/lib/lavorazioni/desktop-notifications";
import { useAuth } from "@/context/auth-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsBtnGhost } from "@/lib/ui/design-system";
import { erpFocus } from "@/lib/ui/erp-tokens";
import {
  SidebarNavIconWrap,
  SidebarSessionExpandChevron,
  sidebarNavIconShellInactive,
  sidebarNavLinkBase,
  sidebarNavLinkInactive,
} from "@/components/gestionale/sidebar-nav-icon-wrap";
import { useNotificationCenter } from "@/src/hooks/gestionale/use-notification-center";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";

const sidebarNavCountBadgeClass =
  "cab-sidebar-nav-badge max-w-[4rem] shrink-0 overflow-hidden rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200";

const notificationFooterBtnClass = `${dsBtnGhost} min-h-[2rem] shrink-0`;

const notificationFooterBtnSplitClass = `${notificationFooterBtnClass} min-w-0 flex-1 sm:flex-none`;

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
  const { mode } = useNotificationsV2Mode();
  const statusLabel = formatDesktopNotificationPermissionStatusLabel(permissionState);
  const canEnable = permissionState === "default" || permissionState === "denied";
  const canSendTest = permissionState === "granted" && Boolean(user?.id);
  const desktopActive = permissionState === "granted";

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

  return (
    <footer className="flex shrink-0 flex-col gap-2 border-t border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-2.5">
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
            <button type="button" className={notificationFooterBtnClass} onClick={() => void handleEnable()}>
              Abilita
            </button>
          ) : null}
          {canSendTest ? (
            <button type="button" className={notificationFooterBtnClass} onClick={() => void handleTest()}>
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
          className={notificationFooterBtnSplitClass}
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
        >
          Segna tutte lette
        </button>
        <span className="hidden h-4 w-px shrink-0 bg-[color:var(--cab-border)] sm:block" aria-hidden />
        <button
          type="button"
          className={notificationFooterBtnSplitClass}
          disabled={readCount === 0}
          onClick={onRemoveRead}
        >
          Elimina lette
        </button>
      </div>
    </footer>
  );
}

function InboxNotificationMessageRow({
  row,
  unread,
  onMarkRead,
  onNavigate,
  onDismiss,
}: {
  row: InboxNotificationRow;
  unread: boolean;
  onMarkRead: () => void;
  onNavigate: () => void;
  onDismiss: () => void;
}) {
  const openLabel = getInboxNotificationOpenLinkLabel(row);
  const vm = toInboxNotificationLogViewModel(row);

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

type NotificationCenterBellProps = {
  sidebarCollapsed?: boolean;
  onExpandIntent?: () => void;
  onOpenInbox?: () => void;
  /** Riga nel blocco sessione unificato (sidebar/drawer). */
  embedded?: boolean;
};

const sidebarNotificationsLinkClass =
  "cab-sidebar-nav-link group relative grid w-full min-h-10 shrink-0 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-lg px-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100/95 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/90 dark:hover:text-zinc-100";

export function NotificationCenterBell({
  sidebarCollapsed = false,
  onExpandIntent,
  onOpenInbox,
  embedded = false,
}: NotificationCenterBellProps) {
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
    isLoading,
    markAllRead,
    markNotificationRead,
    dismissNotification,
    removeReadNotifications,
    isUnread,
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

  const onNavigate = useCallback(
    (row: InboxNotificationRow) => {
      close();
      const href = inboxNotificationHref(row);
      if (href) router.push(href);
    },
    [close, router],
  );

  const handleMarkAllRead = useCallback(() => void markAllRead(), [markAllRead]);
  const handleRemoveRead = useCallback(() => void removeReadNotifications(), [removeReadNotifications]);

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

  const drawerTitle =
    unreadCount > 0
      ? `Notifiche (${unreadCount} non ${unreadCount === 1 ? "letta" : "lette"})`
      : "Notifiche";

  const ariaLabel =
    unreadCount > 0 ? `Notifiche (${unreadCount} non lette)` : "Notifiche";

  const collapsed = embedded && sidebarCollapsed;

  const navPointerIntentProps = collapsed
    ? {
        onPointerEnter: () => onExpandIntent?.(),
        onFocus: () => onExpandIntent?.(),
      }
    : {};

  const embeddedTrigger = (
    <button
      type="button"
      onClick={toggle}
      className={`cab-sidebar-session-row ${sidebarNavLinkBase} ${sidebarNavLinkInactive} ${erpFocus} relative overflow-visible ${
        open ? "cab-sidebar-session-item--open" : ""
      } ${bellArrive ? "cab-notification-bell--arrive" : ""}`.trim()}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      data-testid="smoke-notifications"
      {...navPointerIntentProps}
    >
      <SidebarNavIconWrap
        shellClass={sidebarNavIconShellInactive}
        className={`relative overflow-visible ${bellArrive ? "cab-notification-bell-icon--arrive" : ""}`.trim()}
      >
        <NotificationBellIcon />
        {collapsed && unreadCount > 0 ? <NotificationCountBadge count={unreadCount} /> : null}
      </SidebarNavIconWrap>
      <span className="cab-sidebar-nav-label min-w-0 truncate text-left leading-tight">Notifiche</span>
      {unreadCount > 0 ? (
        <span className={sidebarNavCountBadgeClass}>{unreadCount > 99 ? "99+" : unreadCount}</span>
      ) : (
        <span className="cab-sidebar-account-chevron shrink-0" aria-hidden>
          <SidebarSessionExpandChevron active={open} />
        </span>
      )}
    </button>
  );

  const standaloneTrigger = (
    <button
      type="button"
      onClick={toggle}
      className={`${sidebarNotificationsLinkClass} ${erpFocus} relative w-full cursor-pointer overflow-visible`}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      data-testid="smoke-notifications"
    >
      <span className="cab-sidebar-nav-icon-slot flex h-7 w-7 shrink-0 items-center justify-center">
        <span className="cab-sidebar-nav-icon relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-200">
          <NotificationBellIcon />
          {unreadCount > 0 ? <NotificationCountBadge count={unreadCount} /> : null}
        </span>
      </span>
      <span className="cab-sidebar-nav-label min-w-0 truncate leading-tight">Notifiche</span>
      {unreadCount > 0 ? (
        <span className={sidebarNavCountBadgeClass}>{unreadCount > 99 ? "99+" : unreadCount}</span>
      ) : null}
    </button>
  );

  const triggerButton = embedded ? embeddedTrigger : standaloneTrigger;

  const trigger =
    collapsed ? (
      <Tooltip content={unreadCount > 0 ? `Notifiche (${unreadCount})` : "Notifiche"} side="right">
        {triggerButton}
      </Tooltip>
    ) : (
      triggerButton
    );

  return (
    <>
      {embedded ? trigger : <div className="cab-sidebar-notifications relative shrink-0 px-1 pb-2">{trigger}</div>}

      <Drawer
        open={open}
        onClose={close}
        title={drawerTitle}
        ariaLabel="Centro notifiche"
        asideClassName={gestionaleLogPanelAsideClass}
      >
        <div className={`${gestionaleLogDrawerPanelClass} flex min-h-0 min-w-0 flex-1 flex-col gap-0 p-0 md:p-0`}>
          <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1 px-3 pt-2`}>
            {notifications.length === 0 ? (
              <GestionaleLogEmpty message="Nessuna notifica al momento." />
            ) : (
              <GestionaleLogList>
                {notifications.map((row) => (
                  <li key={row.id} className="list-none">
                    <InboxNotificationMessageRow
                      row={row}
                      unread={isUnread(row)}
                      onMarkRead={() => void markNotificationRead(row)}
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
            unreadCount={unreadCount}
            readCount={readCount}
            onMarkAllRead={handleMarkAllRead}
            onRemoveRead={handleRemoveRead}
          />
        </div>
      </Drawer>
    </>
  );
}
