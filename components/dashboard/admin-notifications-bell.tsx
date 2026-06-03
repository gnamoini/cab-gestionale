"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CloseButton, Tooltip } from "@/components/design-system";
import {
  adminNotificationBadgeLabel,
  buildAdminNotificationDipendentiHref,
  buildAdminNotificationLavorazioneHref,
  buildAdminNotificationMagazzinoHref,
} from "@/lib/lavorazioni/admin-notifications";
import { formatNotificationRelativeTime } from "@/lib/lavorazioni/format-notification-relative-time";
import {
  isAdminDashboardTestNotification,
  isDashboardPromemoriaReminderNotification,
  isDipendentiPresenzeReminderNotification,
  isLavorazioneDashboardNotification,
  isMagazzinoDashboardNotification,
  type AdminDashboardNotification,
} from "@/lib/notifications/admin-dashboard-notifications";
import { buildAdminNotificationDashboardHref } from "@/lib/lavorazioni/admin-notifications";
import { dsPageToolbarIconBtn, dsScrollbar } from "@/lib/ui/design-system";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { useAdminNotificationStore } from "@/src/hooks/gestionale/use-admin-notification-store";

const PANEL_TITLE_ID = "admin-notifications-panel-title";

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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const el = panelRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
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

  return (
    <div ref={panelRef} className="relative shrink-0">
      <Tooltip content={unreadCount > 0 ? `Notifiche (${unreadCount})` : "Notifiche"}>
        <button
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

      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={PANEL_TITLE_ID}
          className={`absolute right-0 top-[calc(100%+0.35rem)] z-50 flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-lg)] ${dsScrollbar}`}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--cab-border)] px-3 py-2.5">
            <div className="min-w-0">
              <h2 id={PANEL_TITLE_ID} className="text-sm font-semibold text-[color:var(--cab-text)]">
                Notifiche
              </h2>
              <p className="text-[11px] text-[color:var(--cab-text-muted)]">
                {unreadCount > 0 ? `${unreadCount} non lette` : "Nessuna notifica non letta"}
              </p>
            </div>
            <CloseButton onClick={close} className="shrink-0" />
          </header>

          <div className="max-h-[min(24rem,60vh)] space-y-2 overflow-y-auto overscroll-contain p-2">
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-[color:var(--cab-text-muted)]">Nessuna notifica.</p>
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

          <footer className="flex shrink-0 flex-col gap-2 border-t border-[color:var(--cab-border)] px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <button
              type="button"
              className="text-[11px] font-medium text-[color:var(--cab-primary)] hover:underline disabled:opacity-50"
              disabled={unreadCount === 0}
              onClick={() => markAllRead()}
            >
              Segna tutte lette
            </button>
            <button
              type="button"
              className="text-[11px] font-medium text-[color:var(--cab-text-muted)] hover:underline hover:text-[color:var(--cab-text)] disabled:opacity-50"
              disabled={readCount === 0}
              onClick={() => removeReadNotifications()}
            >
              Elimina lette
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
