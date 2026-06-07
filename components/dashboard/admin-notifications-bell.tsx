"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  NotificationBellTrigger,
  NotificationEmptyState,
  NotificationList,
  NotificationMetaLine,
  NotificationOpenLink,
  NotificationPanelHeader,
  NotificationPanelShell,
  NotificationRowBody,
  NotificationRowHeader,
  NotificationRowShell,
  NotificationRowSurface,
  NotificationSottoScortaRow,
  Tooltip,
} from "@/components/design-system";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import {
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
} from "@/lib/lavorazioni/admin-notifications";
import { formatNotificationRelativeTime } from "@/lib/lavorazioni/format-notification-relative-time";
import {
  buildAdminDashboardTestNotification,
  isAdminDashboardTestNotification,
  isDashboardPromemoriaReminderNotification,
  isDipendentiPresenzeReminderNotification,
  isLavorazioneDashboardNotification,
  isMagazzinoDashboardNotification,
  type AdminDashboardNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import { publishAdminDashboardNotification } from "@/lib/notifications/admin-dashboard-desktop";
import {
  formatDesktopNotificationPermissionStatusLabel,
  getDesktopNotificationPermissionState,
  requestDesktopNotificationPermissionInteractive,
  type DesktopNotificationPermissionState,
} from "@/lib/lavorazioni/desktop-notifications";
import { useAuth } from "@/context/auth-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { buildAdminNotificationDashboardHref } from "@/lib/lavorazioni/admin-notifications";
import { GLOBAL_DROPDOWN_VIEWPORT_PAD } from "@/lib/ui/global-dropdown-portal";
import { dsBtnGhost } from "@/lib/ui/design-system";
import {
  dsNotificationPanelMaxHeightPx,
  dsNotificationPanelMinWidthPx,
  dsNotificationPanelWidthPx,
  type NotificationSeverity,
} from "@/lib/ui/notification-ui";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useAdminNotificationStore } from "@/src/hooks/gestionale/use-admin-notification-store";

const PANEL_TITLE_ID = "admin-notifications-panel-title";

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
    const { added, desktop } = await publishAdminDashboardNotification(
      userId,
      buildAdminDashboardTestNotification(),
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
            <button type="button" className={dsBtnGhost} onClick={() => void handleEnable()}>
              Abilita
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

const PROMEMORIA_SECTION_SELECTOR = 'section[aria-label="Calendario promemoria"]';

/** Larghezza colonna calendario promemoria (stesso blocco della dashboard). */
function measurePromemoriaCalendarColumnWidth(): number | null {
  if (typeof document === "undefined") return null;
  const section = document.querySelector(PROMEMORIA_SECTION_SELECTOR);
  if (!(section instanceof HTMLElement)) return null;

  const calendarCol = section.querySelector(
    ':scope > div.grid > [aria-label="Calendario promemoria"], :scope > div.grid > div:first-child',
  );
  if (calendarCol instanceof HTMLElement) {
    const w = calendarCol.getBoundingClientRect().width;
    if (w > 0) return Math.round(w);
  }

  const innerCalendar = section.querySelector('div[aria-label="Calendario promemoria"]');
  if (innerCalendar instanceof HTMLElement && innerCalendar !== section) {
    const w = innerCalendar.getBoundingClientRect().width;
    if (w > 0) return Math.round(w);
  }

  const sectionW = section.getBoundingClientRect().width;
  return sectionW > 0 ? Math.round(sectionW) : null;
}

function resolveNotificationsPanelWidth(measured: number | null): number {
  const vwCap = Math.max(
    dsNotificationPanelMinWidthPx,
    (typeof document !== "undefined" ? document.documentElement.clientWidth : 0) -
      GLOBAL_DROPDOWN_VIEWPORT_PAD * 2,
  );
  const base = measured ?? dsNotificationPanelWidthPx;
  return Math.min(Math.max(base, dsNotificationPanelMinWidthPx), vwCap);
}

function NotificationRowCard({
  unread,
  severity = "info",
  onMarkRead,
  children,
}: {
  unread: boolean;
  severity?: NotificationSeverity;
  onMarkRead: () => void;
  children: ReactNode;
}) {
  return (
    <NotificationRowSurface
      unread={unread}
      severity={severity}
      onClick={onMarkRead}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onMarkRead();
        }
      }}
    >
      {children}
    </NotificationRowSurface>
  );
}

function LavorazioneNotificationRow({
  row,
  unread,
  onMarkRead,
  onNavigate,
}: {
  row: Extract<AdminDashboardNotification, { kind: "lavorazione_created" }>;
  unread: boolean;
  onMarkRead: () => void;
  onNavigate: () => void;
}) {
  const relative = formatNotificationRelativeTime(row.createdAt);

  return (
    <NotificationRowCard unread={unread} onMarkRead={onMarkRead}>
      <NotificationRowHeader title="Nuova lavorazione" unread={unread} relative={relative || "Adesso"} />
      <NotificationRowBody>
        <NotificationMetaLine label="Cliente" value={row.cliente?.trim() || "—"} />
        <NotificationMetaLine label="Mezzo" value={row.mezzo?.trim() || "—"} />
        {row.targa?.trim() ? <NotificationMetaLine label="Targa" value={row.targa.trim()} /> : null}
        {row.titolo?.trim() ? (
          <p className="pt-0.5 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">{row.titolo.trim()}</p>
        ) : null}
      </NotificationRowBody>
      <NotificationOpenLink label="Apri lavorazione" onOpen={onNavigate} />
    </NotificationRowCard>
  );
}

function MagazzinoNotificationRow({
  row,
  unread,
  onMarkRead,
  onNavigate,
}: {
  row: Extract<AdminDashboardNotification, { kind: "magazzino_sotto_scorta" }>;
  unread: boolean;
  onMarkRead: () => void;
  onNavigate: () => void;
}) {
  const relative = formatNotificationRelativeTime(row.createdAt);

  return (
    <NotificationSottoScortaRow
      descrizione={row.descrizione ?? ""}
      marca={row.marca ?? ""}
      scorta={row.scorta}
      scortaMinima={row.scortaMinima}
      unread={unread}
      relativeTime={relative || "Adesso"}
      onClick={onMarkRead}
    >
      <NotificationOpenLink label="Apri magazzino" onOpen={onNavigate} />
    </NotificationSottoScortaRow>
  );
}

function DashboardPromemoriaReminderRow({
  row,
  unread,
  onMarkRead,
  onNavigate,
}: {
  row: Extract<AdminDashboardNotification, { kind: "dashboard_promemoria_reminder" }>;
  unread: boolean;
  onMarkRead: () => void;
  onNavigate: () => void;
}) {
  const relative = formatNotificationRelativeTime(row.createdAt);

  return (
    <NotificationRowCard unread={unread} onMarkRead={onMarkRead}>
      <NotificationRowHeader title="Promemoria calendario" unread={unread} relative={relative || "Adesso"} />
      <p className="mt-1.5 text-xs leading-snug text-[color:var(--cab-text)]">{row.message}</p>
      <NotificationOpenLink label="Apri calendario" onOpen={onNavigate} />
    </NotificationRowCard>
  );
}

function DipendentiPresenzeReminderRow({
  row,
  unread,
  onMarkRead,
  onNavigate,
}: {
  row: Extract<AdminDashboardNotification, { kind: "dipendenti_presenze_reminder" }>;
  unread: boolean;
  onMarkRead: () => void;
  onNavigate: () => void;
}) {
  const relative = formatNotificationRelativeTime(row.createdAt);
  const [, y, m, d] = row.dateYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];

  const dateLabel = d && m && y ? `${d}/${m}/${y}` : null;

  return (
    <NotificationRowCard unread={unread} onMarkRead={onMarkRead}>
      <NotificationRowHeader title="Presenze dipendenti" unread={unread} relative={relative || "Adesso"} />
      <p className="mt-1.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">
        Nessuna presenza registrata{dateLabel ? ` per oggi (${dateLabel})` : " per oggi"}.
      </p>
      <NotificationOpenLink label="Apri Dipendenti" onOpen={onNavigate} />
    </NotificationRowCard>
  );
}

function NotificationRow({
  row,
  unread,
  onMarkRead,
  onNavigate,
  onDismiss,
}: {
  row: AdminDashboardNotification;
  unread: boolean;
  onMarkRead: (row: AdminDashboardNotification) => void;
  onNavigate: (row: AdminDashboardNotification) => void;
  onDismiss: (row: AdminDashboardNotification) => void;
}) {
  const dismiss = () => onDismiss(row);
  const markRead = () => onMarkRead(row);
  const navigate = () => onNavigate(row);

  if (isAdminDashboardTestNotification(row)) {
    const relative = formatNotificationRelativeTime(row.createdAt);
    return (
      <NotificationRowShell onDismiss={dismiss}>
        <NotificationRowCard unread={unread} onMarkRead={markRead}>
          <NotificationRowHeader title="Test notifiche" unread={unread} relative={relative || undefined} />
          <p className="mt-1.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">{row.message}</p>
        </NotificationRowCard>
      </NotificationRowShell>
    );
  }

  if (isDashboardPromemoriaReminderNotification(row)) {
    return (
      <NotificationRowShell onDismiss={dismiss}>
        <DashboardPromemoriaReminderRow
          row={row}
          unread={unread}
          onMarkRead={markRead}
          onNavigate={navigate}
        />
      </NotificationRowShell>
    );
  }
  if (isDipendentiPresenzeReminderNotification(row)) {
    return (
      <NotificationRowShell onDismiss={dismiss}>
        <DipendentiPresenzeReminderRow
          row={row}
          unread={unread}
          onMarkRead={markRead}
          onNavigate={navigate}
        />
      </NotificationRowShell>
    );
  }
  if (isMagazzinoDashboardNotification(row)) {
    return (
      <NotificationRowShell onDismiss={dismiss}>
        <MagazzinoNotificationRow row={row} unread={unread} onMarkRead={markRead} onNavigate={navigate} />
      </NotificationRowShell>
    );
  }
  return (
    <NotificationRowShell onDismiss={dismiss}>
      <LavorazioneNotificationRow row={row} unread={unread} onMarkRead={markRead} onNavigate={navigate} />
    </NotificationRowShell>
  );
}

export function AdminNotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [desktopPermissionState, setDesktopPermissionState] = useState(() =>
    getDesktopNotificationPermissionState(),
  );
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  useBodyScrollLock(open, "AdminNotificationsBell");

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const [panelWidthPx, setPanelWidthPx] = useState(dsNotificationPanelWidthPx);

  const syncPanelWidth = useCallback(() => {
    const next = resolveNotificationsPanelWidth(measurePromemoriaCalendarColumnWidth());
    setPanelWidthPx((prev) => (prev === next ? prev : next));
  }, []);

  const { style, floatingRef, isPositioned } = useGlobalDropdownPortal({
    open: open && mounted,
    anchorRef,
    contentRef: panelRef,
    placement: "bottom-end",
    matchAnchorWidth: false,
    panelWidth: panelWidthPx,
    maxHeight: dsNotificationPanelMaxHeightPx,
    repositionDeps: [open, notifications.length, panelWidthPx],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDesktopPermissionState(getDesktopNotificationPermissionState());
  }, [open]);

  const refreshDesktopPermission = useCallback(() => {
    setDesktopPermissionState(getDesktopNotificationPermissionState());
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    syncPanelWidth();
    const section = document.querySelector(PROMEMORIA_SECTION_SELECTOR);
    if (!(section instanceof HTMLElement)) return;
    const ro = new ResizeObserver(() => syncPanelWidth());
    ro.observe(section);
    const grid = section.querySelector(":scope > div.grid");
    if (grid instanceof HTMLElement) {
      ro.observe(grid);
      if (grid.firstElementChild instanceof HTMLElement) ro.observe(grid.firstElementChild);
    }
    return () => ro.disconnect();
  }, [open, syncPanelWidth]);

  useDropdownOutsideDismiss(open, anchorRef, panelRef, close, { when: isPositioned });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const onNavigate = useCallback(
    (row: AdminDashboardNotification) => {
      close();
      if (isAdminDashboardTestNotification(row)) return;
      if (isLavorazioneDashboardNotification(row)) {
        router.push(buildAdminNotificationLavorazioneHref(row.lavorazioneId));
        return;
      }
      if (isMagazzinoDashboardNotification(row)) {
        router.push(buildAdminNotificationMagazzinoHref(row.ricambioId));
        return;
      }
      if (isDipendentiPresenzeReminderNotification(row)) {
        router.push(buildAdminNotificationDipendentiHref());
        return;
      }
      if (isDashboardPromemoriaReminderNotification(row)) {
        router.push(buildAdminNotificationDashboardHref());
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

  const panelSubtitle =
    unreadCount > 0 ? `${unreadCount} non ${unreadCount === 1 ? "letta" : "lette"}` : undefined;

  const panel =
    open && mounted && style ? (
      <NotificationPanelShell
        titleId={PANEL_TITLE_ID}
        shellRef={floatingRef}
        style={style}
        onMouseDown={(e) => e.stopPropagation()}
        header={
          <NotificationPanelHeader
            title="Notifiche"
            titleId={PANEL_TITLE_ID}
            count={unreadCount}
            subtitle={panelSubtitle}
            onClose={close}
          />
        }
        footer={
          <NotificationsPanelFooter
            permissionState={desktopPermissionState}
            onPermissionChange={refreshDesktopPermission}
            unreadCount={unreadCount}
            readCount={readCount}
            onMarkAllRead={markAllRead}
            onRemoveRead={removeReadNotifications}
          />
        }
      >
        {notifications.length === 0 ? (
          <NotificationEmptyState variant="neutral" description="Nessuna notifica al momento." />
        ) : (
          <NotificationList>
            {notifications.map((row) => (
              <li
                key={
                  row.kind === "lavorazione_created"
                    ? row.lavorazioneId
                    : row.kind === "magazzino_sotto_scorta"
                      ? row.ricambioId
                      : row.id
                }
                className="list-none"
              >
                <NotificationRow
                  row={row}
                  unread={isUnread(row)}
                  onMarkRead={handleMarkRead}
                  onNavigate={onNavigate}
                  onDismiss={handleDismiss}
                />
              </li>
            ))}
          </NotificationList>
        )}
      </NotificationPanelShell>
    ) : null;

  return (
    <div className="relative shrink-0">
      <Tooltip content={unreadCount > 0 ? `Notifiche (${unreadCount})` : "Notifiche"}>
        <NotificationBellTrigger
          buttonRef={anchorRef}
          count={unreadCount}
          active={unreadCount > 0}
          activeTone="info"
          ariaLabel={unreadCount > 0 ? `Notifiche (${unreadCount} non lette)` : "Notifiche"}
          ariaExpanded={open}
          onClick={toggle}
        />
      </Tooltip>

      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
