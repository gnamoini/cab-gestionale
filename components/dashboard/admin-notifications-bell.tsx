"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CloseButton, Tooltip } from "@/components/design-system";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import {
  adminNotificationBadgeLabel,
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
import {
  dsBtnGhost,
  dsModalCloseBtn,
  dsModalHeaderInner,
  dsModalHeaderLead,
  dsModalSubtitle,
  dsModalTitle,
  dsModalTitleBlock,
  dsPageToolbarIconBtn,
  dsPageToolbarMetaChipAccent,
  dsScrollbar,
} from "@/lib/ui/design-system";
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
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
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
        <div className="flex flex-wrap items-center gap-1">
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

/** Fallback se la sezione calendario promemoria non è nel DOM. */
const NOTIFICATIONS_PANEL_WIDTH_FALLBACK_PX = 352;

const NOTIFICATIONS_PANEL_MIN_WIDTH_PX = 280;

/** Altezza max area lista (~24rem) + header/footer nel cap del pannello. */
const NOTIFICATIONS_PANEL_MAX_HEIGHT_PX = 480;

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
    NOTIFICATIONS_PANEL_MIN_WIDTH_PX,
    (typeof document !== "undefined" ? document.documentElement.clientWidth : 0) -
      GLOBAL_DROPDOWN_VIEWPORT_PAD * 2,
  );
  const base = measured ?? NOTIFICATIONS_PANEL_WIDTH_FALLBACK_PX;
  return Math.min(Math.max(base, NOTIFICATIONS_PANEL_MIN_WIDTH_PX), vwCap);
}

function DismissReadButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      aria-label="Elimina notifica"
      className="absolute right-1 top-1 rounded p-1 text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function NotificationRowShell({
  unread,
  onDismiss,
  children,
}: {
  unread: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <div className={unread ? "relative" : "relative pr-8"}>
      {children}
      {!unread ? <DismissReadButton onDismiss={onDismiss} /> : null}
    </div>
  );
}

function LavorazioneNotificationRow({
  row,
  unread,
  onNavigate,
}: {
  row: Extract<AdminDashboardNotification, { kind: "lavorazione_created" }>;
  unread: boolean;
  onNavigate: (row: AdminDashboardNotification) => void;
}) {
  const relative = formatNotificationRelativeTime(row.createdAt);

  return (
    <button
      type="button"
      onClick={() => onNavigate(row)}
      className={[
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        unread
          ? "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))]"
          : "border-[color:var(--cab-border)] bg-[var(--cab-card)] hover:bg-[var(--cab-surface-muted)]",
      ].join(" ")}
    >
      <p className="text-xs font-semibold text-[color:var(--cab-text)]">Nuova lavorazione</p>
      <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
        Cliente: <span className="font-medium text-[color:var(--cab-text)]">{row.cliente?.trim() || "—"}</span>
      </p>
      <p className="text-xs text-[color:var(--cab-text-muted)]">
        Mezzo: <span className="font-medium text-[color:var(--cab-text)]">{row.mezzo?.trim() || "—"}</span>
      </p>
      {row.targa?.trim() ? (
        <p className="text-xs text-[color:var(--cab-text-muted)]">
          Targa: <span className="font-medium text-[color:var(--cab-text)]">{row.targa.trim()}</span>
        </p>
      ) : null}
      <p className="mt-1 text-[11px] text-[color:var(--cab-text-muted)]">
        {row.titolo?.trim() ? `${row.titolo.trim()} · ` : ""}
        {relative || "Adesso"}
      </p>
    </button>
  );
}

function MagazzinoNotificationRow({
  row,
  unread,
  onNavigate,
}: {
  row: Extract<AdminDashboardNotification, { kind: "magazzino_sotto_scorta" }>;
  unread: boolean;
  onNavigate: (row: AdminDashboardNotification) => void;
}) {
  const relative = formatNotificationRelativeTime(row.createdAt);

  return (
    <button
      type="button"
      onClick={() => onNavigate(row)}
      className={[
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        unread
          ? "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))]"
          : "border-[color:var(--cab-border)] bg-[var(--cab-card)] hover:bg-[var(--cab-surface-muted)]",
      ].join(" ")}
    >
      <p className="text-xs font-semibold text-[color:var(--cab-text)]">Sotto scorta minima</p>
      <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
        Marca: <span className="font-medium text-[color:var(--cab-text)]">{row.marca?.trim() || "—"}</span>
      </p>
      <p className="text-xs text-[color:var(--cab-text-muted)]">
        Descrizione:{" "}
        <span className="font-medium text-[color:var(--cab-text)]">{row.descrizione?.trim() || "—"}</span>
      </p>
      <p className="text-xs text-[color:var(--cab-text-muted)]">
        Quantità:{" "}
        <span className="font-medium text-[color:var(--cab-text)]">
          {row.scorta} / min {row.scortaMinima}
        </span>
      </p>
      <p className="mt-1 text-[11px] text-[color:var(--cab-text-muted)]">{relative || "Adesso"}</p>
    </button>
  );
}

function DashboardPromemoriaReminderRow({
  row,
  unread,
  onNavigate,
}: {
  row: Extract<AdminDashboardNotification, { kind: "dashboard_promemoria_reminder" }>;
  unread: boolean;
  onNavigate: (row: AdminDashboardNotification) => void;
}) {
  const relative = formatNotificationRelativeTime(row.createdAt);

  return (
    <button
      type="button"
      onClick={() => onNavigate(row)}
      className={[
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        unread
          ? "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))]"
          : "border-[color:var(--cab-border)] bg-[var(--cab-card)] hover:bg-[var(--cab-surface-muted)]",
      ].join(" ")}
    >
      <p className="text-xs font-semibold text-[color:var(--cab-text)]">Promemoria calendario</p>
      <p className="mt-1 text-xs text-[color:var(--cab-text)]">{row.message}</p>
      <p className="mt-1 text-[11px] text-[color:var(--cab-text-muted)]">{relative || "Adesso"}</p>
    </button>
  );
}

function DipendentiPresenzeReminderRow({
  row,
  unread,
  onNavigate,
}: {
  row: Extract<AdminDashboardNotification, { kind: "dipendenti_presenze_reminder" }>;
  unread: boolean;
  onNavigate: (row: AdminDashboardNotification) => void;
}) {
  const relative = formatNotificationRelativeTime(row.createdAt);
  const [, y, m, d] = row.dateYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];

  return (
    <button
      type="button"
      onClick={() => onNavigate(row)}
      className={[
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        unread
          ? "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))]"
          : "border-[color:var(--cab-border)] bg-[var(--cab-card)] hover:bg-[var(--cab-surface-muted)]",
      ].join(" ")}
    >
      <p className="text-xs font-semibold text-[color:var(--cab-text)]">Presenze dipendenti</p>
      <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
        Nessuna presenza registrata per oggi
        {d && m && y ? ` (${d}/${m}/${y})` : ""}.
      </p>
      <p className="mt-1 text-[11px] text-[color:var(--cab-text-muted)]">
        Apri la tabella Dipendenti per completare le ore. {relative ? `· ${relative}` : ""}
      </p>
    </button>
  );
}

function NotificationRow({
  row,
  unread,
  onNavigate,
  onDismiss,
}: {
  row: AdminDashboardNotification;
  unread: boolean;
  onNavigate: (row: AdminDashboardNotification) => void;
  onDismiss: (row: AdminDashboardNotification) => void;
}) {
  const dismiss = () => onDismiss(row);

  if (isAdminDashboardTestNotification(row)) {
    const relative = formatNotificationRelativeTime(row.createdAt);
    return (
      <NotificationRowShell unread={unread} onDismiss={dismiss}>
        <div
          className={[
            "w-full rounded-lg border px-3 py-2.5 text-left",
            unread
              ? "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))]"
              : "border-[color:var(--cab-border)] bg-[var(--cab-card)]",
          ].join(" ")}
        >
          <p className="text-xs font-semibold text-[color:var(--cab-text)]">Test notifiche</p>
          <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">{row.message}</p>
          {relative ? (
            <p className="mt-1 text-[11px] text-[color:var(--cab-text-muted)]">{relative}</p>
          ) : null}
        </div>
      </NotificationRowShell>
    );
  }

  if (isDashboardPromemoriaReminderNotification(row)) {
    return (
      <NotificationRowShell unread={unread} onDismiss={dismiss}>
        <DashboardPromemoriaReminderRow row={row} unread={unread} onNavigate={onNavigate} />
      </NotificationRowShell>
    );
  }
  if (isDipendentiPresenzeReminderNotification(row)) {
    return (
      <NotificationRowShell unread={unread} onDismiss={dismiss}>
        <DipendentiPresenzeReminderRow row={row} unread={unread} onNavigate={onNavigate} />
      </NotificationRowShell>
    );
  }
  if (isMagazzinoDashboardNotification(row)) {
    return (
      <NotificationRowShell unread={unread} onDismiss={dismiss}>
        <MagazzinoNotificationRow row={row} unread={unread} onNavigate={onNavigate} />
      </NotificationRowShell>
    );
  }
  return (
    <NotificationRowShell unread={unread} onDismiss={dismiss}>
      <LavorazioneNotificationRow row={row} unread={unread} onNavigate={onNavigate} />
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
    dismissNotification,
    removeReadNotifications,
    isUnread,
  } = useAdminNotificationStore();

  useBodyScrollLock(open, "AdminNotificationsBell");

  const badge = adminNotificationBadgeLabel(unreadCount);
  const close = useCallback(() => setOpen(false), []);

  const [panelWidthPx, setPanelWidthPx] = useState(NOTIFICATIONS_PANEL_WIDTH_FALLBACK_PX);

  const syncPanelWidth = useCallback(() => {
    setPanelWidthPx(resolveNotificationsPanelWidth(measurePromemoriaCalendarColumnWidth()));
  }, []);

  const { style, floatingRef } = useGlobalDropdownPortal({
    open: open && mounted,
    anchorRef,
    contentRef: panelRef,
    placement: "bottom-end",
    matchAnchorWidth: false,
    panelWidth: panelWidthPx,
    maxHeight: NOTIFICATIONS_PANEL_MAX_HEIGHT_PX,
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

  useDropdownOutsideDismiss(open, anchorRef, panelRef, close);

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

  const handleDismiss = useCallback(
    (row: AdminDashboardNotification) => {
      dismissNotification(row);
    },
    [dismissNotification],
  );

  if (permLoading || !enabled) return null;

  const panelShellClass = [
    "flex min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--cab-border)]",
    "bg-[var(--cab-card)] shadow-[var(--cab-shadow-lg)]",
    dsScrollbar,
  ].join(" ");

  const panel =
    open && mounted && style ? (
      <div
        ref={floatingRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={PANEL_TITLE_ID}
        className={panelShellClass}
        style={style}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 border-b border-[color:var(--cab-border)] px-3 py-2.5">
          <div className={dsModalHeaderInner}>
            <div className={dsModalHeaderLead}>
              <div className={dsModalTitleBlock}>
                <div className="flex min-w-0 items-center gap-2">
                  <h2 id={PANEL_TITLE_ID} className={`${dsModalTitle} text-sm`}>
                    Notifiche
                  </h2>
                  {unreadCount > 0 ? (
                    <span className={dsPageToolbarMetaChipAccent} aria-hidden>
                      {unreadCount}
                    </span>
                  ) : null}
                </div>
                {unreadCount > 0 ? (
                  <p className={dsModalSubtitle}>
                    {unreadCount} non {unreadCount === 1 ? "letta" : "lette"}
                  </p>
                ) : null}
              </div>
            </div>
            <CloseButton onClick={close} className={dsModalCloseBtn} />
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
          {notifications.length === 0 ? (
            <p className="py-10 text-center text-sm text-[color:var(--cab-text-muted)]">
              Nessuna notifica al momento.
            </p>
          ) : (
            notifications.map((row) => (
              <NotificationRow
                key={
                  row.kind === "lavorazione_created"
                    ? row.lavorazioneId
                    : row.kind === "magazzino_sotto_scorta"
                      ? row.ricambioId
                      : row.id
                }
                row={row}
                unread={isUnread(row)}
                onNavigate={onNavigate}
                onDismiss={handleDismiss}
              />
            ))
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
    ) : null;

  return (
    <div className="relative shrink-0">
      <Tooltip content={unreadCount > 0 ? `Notifiche (${unreadCount})` : "Notifiche"}>
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={[
            dsPageToolbarIconBtn,
            "relative",
            unreadCount > 0
              ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_40%,transparent)]"
              : "",
          ].join(" ")}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={unreadCount > 0 ? `Notifiche (${unreadCount} non lette)` : "Notifiche"}
        >
          <span className="relative inline-flex text-zinc-600 dark:text-zinc-300" aria-hidden>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {badge ? (
              <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </span>
          <span className="sr-only">Notifiche</span>
        </button>
      </Tooltip>

      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
