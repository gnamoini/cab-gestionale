"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Drawer,
  LogEntry,
  NotificationBellIcon,
  NotificationBellTrigger,
  NotificationCountBadge,
  NotificationRowDismiss,
  Tooltip,
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
  getInboxNotificationOpenLinkLabel,
  inboxNotificationHref,
  toInboxNotificationLogViewModel,
} from "@/lib/notifications/inbox-notification-message";
import type { InboxNotificationRow } from "@/lib/notifications/notification-types";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { dispatchInboxSystemNotification } from "@/lib/notifications/inbox-system-notification";
import { buildAdminDashboardTestNotification } from "@/lib/notifications/admin-dashboard-notifications";
import { dispatchAdminDashboardTestSystemNotification } from "@/lib/notifications/admin-dashboard-test-system";
import {
  getDesktopNotificationPermissionState,
  type DesktopNotificationPermissionState,
} from "@/lib/lavorazioni/desktop-notifications";
import { shouldPreferPwaPushOverDesktopPrompt } from "@/lib/pwa/push-permission-flow";
import { usePwaPushOptIn } from "@/src/hooks/use-pwa-push-opt-in";
import { notificationOptInDeniedMessage, notificationOptInSuccessMessage } from "@/lib/notifications/notification-opt-in-copy";
import { useNotificationOptIn } from "@/src/hooks/use-notification-opt-in";
import { useAuth } from "@/context/auth-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { dsBtnGhost, dsFocus, dsShellNavIconBtn } from "@/lib/ui/design-system";
import {
  dsNotificationDesktopStatusActive,
  dsNotificationDesktopStatusDotActive,
  dsNotificationDesktopStatusDotInactive,
  dsNotificationDesktopStatusInactive,
} from "@/lib/ui/notification-ui";
import { SidebarNavRow, SidebarSessionExpandChevron } from "@/components/gestionale/sidebar-nav-row";
import { useNotificationCenter } from "@/src/hooks/gestionale/use-notification-center";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { isClientInboxEligible } from "@/lib/notifications/client-inbox-eligible";
import {
  getNotificationCenterOpenSnapshot,
  subscribeNotificationCenterOpen,
} from "@/lib/pwa/pwa-notification-state";
import { suppressSidebarBlurCollapse } from "@/lib/ui/use-sidebar-collapsed";
import { NotificationSettingsModal } from "@/components/gestionale/notifications/notification-settings-modal";

const notificationFooterBtnClass = `${dsBtnGhost} min-h-[2rem] shrink-0`;

/** ponytail: allineato a realtime-inbox-coordinator SEEN_TTL_MS — upgrade: export SSOT condiviso */
const CLIENT_TOAST_SEEN_TTL_MS = 5 * 60_000;

function pruneClientToastSeen(seen: Map<string, number>, now = Date.now()) {
  for (const [id, ts] of seen) {
    if (now - ts > CLIENT_TOAST_SEEN_TTL_MS) seen.delete(id);
  }
}

function NotificationPanelSettingsButton({
  buttonRef,
  onClick,
}: {
  buttonRef?: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${dsShellNavIconBtn} ${dsFocus}`}
      aria-label="Impostazioni notifiche"
      title="Impostazioni notifiche"
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[1.125rem] w-[1.125rem]" aria-hidden>
        <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}

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
  const pushOptIn = usePwaPushOptIn();
  const preferPush = shouldPreferPwaPushOverDesktopPrompt();
  const pushActive = pushOptIn.permissionState === "granted";
  const desktopActive = permissionState === "granted";
  const notificationsActive = preferPush ? pushActive : desktopActive;
  const statusLabel = notificationsActive ? "ATTIVE" : "NON ATTIVE";
  const statusClass = notificationsActive ? dsNotificationDesktopStatusActive : dsNotificationDesktopStatusInactive;
  const dotClass = notificationsActive ? dsNotificationDesktopStatusDotActive : dsNotificationDesktopStatusDotInactive;

  const handleTest = async () => {
    const userId = user?.id;
    if (!userId) return;
    const testNotification = buildAdminDashboardTestNotification();
    const { added, desktop } = await publishNotification(userId, testNotification, mode);
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

  const statusTooltip = notificationsActive
    ? preferPush
      ? "Notifiche push attive.\nClic per inviare una notifica di prova."
      : "Notifiche desktop attive.\nClic per inviare una notifica di prova."
    : preferPush
      ? "Notifiche push non attive.\nClic per una prova in campanella."
      : "Notifiche desktop non attive.\nClic per una prova in campanella.";
  const statusAriaLabel = notificationsActive
    ? preferPush
      ? "Notifiche push attive. Invia notifica di prova"
      : "Notifiche desktop attive. Invia notifica di prova"
    : preferPush
      ? "Notifiche push non attive. Invia notifica di prova in campanella"
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
  showDesktopControls = true,
}: {
  permissionState: DesktopNotificationPermissionState;
  onPermissionChange: () => void;
  notificationCount: number;
  onDismissAll: () => void | Promise<void>;
  isDismissingAll: boolean;
  showDesktopControls?: boolean;
}) {
  const gestToast = useGestionaleToast();
  const optIn = useNotificationOptIn();
  const canEnable = optIn.menuEnableVisible;
  const showDeniedHint = showDesktopControls && permissionState === "denied";
  const showDismissAll = notificationCount > 0;

  if (!canEnable && !showDeniedHint && !showDismissAll) return null;

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
              Abilita notifiche
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
  onClose,
  onDismiss,
}: {
  row: InboxNotificationRow;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const vm = toInboxNotificationLogViewModel(row);
  const href = inboxNotificationHref(row);
  const openLabel = href ? getInboxNotificationOpenLinkLabel(row) : null;

  return (
    <div className="min-w-0">
      <LogEntry
        vm={vm}
        variant="inbox"
        href={href ?? undefined}
        onAfterNavigate={onClose}
        title={openLabel ?? undefined}
        trailing={<NotificationRowDismiss embedded onDismiss={onDismiss} />}
      />
    </div>
  );
}

type NotificationCenterBellProps = {
  sidebarCollapsed?: boolean;
  onExpandIntent?: () => void;
  onOpenInbox?: () => void;
  /** Sopra drawer nav mobile (come profilo). */
  layerAboveNav?: boolean;
  /** Riga nel blocco sessione unificato (sidebar/drawer). */
  embedded?: boolean;
  /** Icona campanella in header pagina (stile PageHeader). */
  headerTrigger?: boolean;
};

export function NotificationCenterBell({
  sidebarCollapsed = false,
  onExpandIntent,
  onOpenInbox,
  layerAboveNav = false,
  embedded = false,
  headerTrigger = false,
}: NotificationCenterBellProps) {
  const gestToast = useGestionaleToast();
  const { user } = useAuth();
  const { snapshot } = useEffectivePermissions();
  const staffInbox = isStaffInboxEligible(
    snapshot?.role ? { ruolo: snapshot.role } : user,
    snapshot?.rbacContext,
  );
  const clientInbox = isClientInboxEligible(
    snapshot?.role ? { ruolo: snapshot.role } : user,
    snapshot?.rbacContext,
  );
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openSignal = useSyncExternalStore(
    subscribeNotificationCenterOpen,
    getNotificationCenterOpenSnapshot,
    () => 0,
  );
  const [desktopPermissionState, setDesktopPermissionState] = useState(() =>
    getDesktopNotificationPermissionState(),
  );
  const {
    notifications,
    unreadCount,
    isLoading,
    dismissNotification,
    dismissAllNotifications,
    isDismissingAll,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useNotificationCenter(open);

  const close = useCallback(() => setOpen(false), []);
  const openSettings = useCallback(() => {
    suppressSidebarBlurCollapse();
    setSettingsOpen(true);
  }, []);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const toggle = useCallback(() => {
    if (!openRef.current) onOpenInbox?.();
    setOpen((v) => !v);
  }, [onOpenInbox]);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

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

  const prevUnreadRef = useRef<number | null>(null);
  const [bellArrive, setBellArrive] = useState(false);
  const clientToastSeenRef = useRef<Map<string, number>>(new Map());
  const inboxSystemSeenRef = useRef<Map<string, number>>(new Map());
  const inboxEligible = staffInbox || clientInbox;

  useEffect(() => {
    if (!clientInbox || isLoading || open) return;
    const now = Date.now();
    pruneClientToastSeen(clientToastSeenRef.current, now);
    for (const row of notifications) {
      if (!row.is_unread) continue;
      if (row.type !== "client_portal_ingresso" && row.type !== "client_portal_completata") continue;
      const seenAt = clientToastSeenRef.current.get(row.id);
      if (seenAt != null && now - seenAt <= CLIENT_TOAST_SEEN_TTL_MS) continue;
      clientToastSeenRef.current.set(row.id, now);
      const message = row.body?.trim() || row.title?.trim() || "Nuova notifica";
      gestToast.info(message, 6000);
    }
  }, [clientInbox, gestToast, isLoading, notifications, open]);

  useEffect(() => {
    if (!inboxEligible || isLoading || open) return;
    const now = Date.now();
    pruneClientToastSeen(inboxSystemSeenRef.current, now);
    for (const row of notifications) {
      if (!row.is_unread) continue;
      if (row.type === "admin_dashboard_test") continue;
      const seenAt = inboxSystemSeenRef.current.get(row.id);
      if (seenAt != null && now - seenAt <= CLIENT_TOAST_SEEN_TTL_MS) continue;
      inboxSystemSeenRef.current.set(row.id, now);
      void dispatchInboxSystemNotification(row);
    }
  }, [inboxEligible, isLoading, notifications, open]);

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

  const drawerTitle = "Notifiche";

  const ariaLabel = unreadCount > 0 ? `Notifiche (${unreadCount} nuove)` : "Notifiche";

  const collapsed = embedded && sidebarCollapsed;

  const showUnreadBadge = unreadCount > 0 && !open && !collapsed;

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
    </span>
  );

  const navLabel = collapsed ? (
    "Notifiche"
  ) : (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span>Notifiche</span>
      {showUnreadBadge ? <NotificationCountBadge count={unreadCount} variant="sidebarTrailing" /> : null}
    </span>
  );

  const trailingExpanded = !collapsed ? <SidebarSessionExpandChevron active={open} /> : undefined;

  const triggerButton = headerTrigger ? (
    <div className="relative shrink-0">
      <NotificationBellTrigger
        count={unreadCount}
        active={unreadCount > 0}
        activeTone="info"
        ariaLabel={ariaLabel}
        ariaExpanded={open}
        onClick={toggle}
      />
    </div>
  ) : (
    <SidebarNavRow
      ref={triggerRef}
      as="button"
      onClick={toggle}
      collapsed={collapsed}
      open={open}
      railTooltip={unreadCount > 0 ? `Notifiche (${unreadCount})` : "Notifiche"}
      className={`overflow-visible ${bellArrive ? "cab-notification-bell--arrive" : ""}`.trim()}
      icon={bellIcon}
      label={navLabel}
      trailing={trailingExpanded}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      aria-busy={isLoading || undefined}
      data-testid="smoke-notifications"
      {...navPointerIntentProps}
    />
  );

  const trigger = triggerButton;

  const drawerPanel = (
    <Drawer
      open={open}
      onClose={close}
      title={drawerTitle}
      layerClassName={layerAboveNav ? "z-[110]" : undefined}
      restoreFocusRef={layerAboveNav ? triggerRef : undefined}
      titleAddon={
        staffInbox ? (
          <NotificationsDesktopStatusBadge
            permissionState={desktopPermissionState}
            onPermissionChange={refreshDesktopPermission}
          />
        ) : undefined
      }
      headerActions={
        staffInbox ? (
          <NotificationPanelSettingsButton buttonRef={settingsTriggerRef} onClick={openSettings} />
        ) : undefined
      }
      ariaLabel="Centro notifiche"
      asideClassName={gestionaleLogPanelAsideClass}
      contentFill
    >
      <div className={gestionaleLogDrawerPanelFillClass}>
        <div className={`${gestionaleLogScrollClass} ${gestionaleLogDrawerScrollInsetClass} min-h-0 min-w-0 flex-1`}>
          {isLoading ? (
            <GestionaleLogEmpty message="Caricamento notifiche…" />
          ) : notifications.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna notifica al momento." />
          ) : (
            <GestionaleLogList>
              {notifications.map((row) => (
                <li key={row.id} className="list-none">
                  <InboxNotificationMessageRow
                    row={row}
                    onClose={close}
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
          showDesktopControls={staffInbox}
          permissionState={desktopPermissionState}
          onPermissionChange={refreshDesktopPermission}
          notificationCount={notifications.length}
          onDismissAll={handleDismissAll}
          isDismissingAll={isDismissingAll}
        />
      </div>
    </Drawer>
  );

  return (
    <>
      {embedded || headerTrigger ? (
        trigger
      ) : (
        <div className="cab-sidebar-notifications relative shrink-0 px-1 pb-2">{trigger}</div>
      )}

      {typeof document !== "undefined" ? createPortal(drawerPanel, document.body) : drawerPanel}
      <NotificationSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        layerClassName={layerAboveNav ? "z-[120]" : "z-[60]"}
        lockScroll={false}
        portaled
        restoreFocusRef={settingsTriggerRef}
      />
    </>
  );
}
