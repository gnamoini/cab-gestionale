"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";
import { CloseButton } from "@/components/design-system/close-button";
import {
  dsNotificationBellBadgeBase,
  dsNotificationBellBadgeCompact,
  dsNotificationBellBadgeWide,
  dsNotificationBellIcon,
  dsNotificationBellIconActive,
  dsNotificationBellIconIdle,
  dsNotificationBellTriggerActiveDanger,
  dsNotificationBellTriggerActiveInfo,
  dsNotificationDangerAccentText,
  dsNotificationDangerDetailText,
  dsNotificationListClass,
  dsNotificationOpenLink,
  dsNotificationPanelBody,
  dsNotificationPanelHint,
  dsNotificationPanelShell,
  dsNotificationQtyChip,
  dsNotificationQtyChipCaption,
  dsNotificationRowMeta,
  dsNotificationRowMetaValue,
  dsNotificationRowSurface,
  dsNotificationRowTitle,
  dsNotificationRowTime,
  dsNotificationUnreadDotClass,
  formatNotificationCountBadge,
  type NotificationSeverity,
} from "@/lib/ui/notification-ui";
import {
  dsFocus,
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

export function NotificationBellIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      className={`${dsNotificationBellIcon} ${active ? dsNotificationBellIconActive : dsNotificationBellIconIdle}`}
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.12 : undefined}
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

export function NotificationCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = formatNotificationCountBadge(count);
  const wide = count > 9;
  return (
    <span
      className={`${dsNotificationBellBadgeBase} ${wide ? dsNotificationBellBadgeWide : dsNotificationBellBadgeCompact}`}
      aria-hidden
    >
      {label}
    </span>
  );
}

export function NotificationRowHeader({
  title,
  unread,
  relative,
  severity = "info",
}: {
  title: string;
  unread: boolean;
  relative?: string;
  severity?: NotificationSeverity;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className={`min-w-0 ${dsNotificationRowTitle}`}>
        {unread ? (
          <span className={dsNotificationUnreadDotClass(severity)} aria-hidden />
        ) : null}
        {title}
      </p>
      {relative ? <span className={dsNotificationRowTime}>{relative}</span> : null}
    </div>
  );
}

export function NotificationMetaLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className={dsNotificationRowMeta}>
      {label}: <span className={dsNotificationRowMetaValue}>{value}</span>
    </p>
  );
}

export function NotificationRowBody({ children }: { children: ReactNode }) {
  return <div className="mt-1.5 space-y-0.5">{children}</div>;
}

export function NotificationRowSurface({
  unread,
  severity = "info",
  interactive = true,
  className = "",
  children,
  ...rest
}: {
  unread: boolean;
  severity?: NotificationSeverity;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
} & (
  | { as?: "div"; onClick?: () => void; onKeyDown?: (e: KeyboardEvent) => void; role?: string; tabIndex?: number }
  | { as: "button"; onClick: () => void; type?: "button" }
)) {
  const surfaceClass = `${dsNotificationRowSurface({ unread, severity, interactive })} ${className}`.trim();

  if ("as" in rest && rest.as === "button") {
    const { onClick, type = "button" } = rest;
    return (
      <button type={type} onClick={onClick} className={`${surfaceClass} ${dsFocus} w-full min-w-0 text-left`}>
        {children}
      </button>
    );
  }

  const { onClick, onKeyDown, role, tabIndex } = rest as {
    onClick?: () => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    role?: string;
    tabIndex?: number;
  };

  if (onClick) {
    return (
      <div
        role={role ?? "button"}
        tabIndex={tabIndex ?? 0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={`${surfaceClass} cursor-pointer ${dsFocus}`}
      >
        {children}
      </div>
    );
  }

  return <div className={surfaceClass}>{children}</div>;
}

export function NotificationRowDismiss({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      aria-label="Elimina notifica"
      className={`absolute right-1.5 top-1.5 z-[1] rounded-md p-1 text-[color:var(--cab-text-muted)] opacity-70 transition-opacity hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] hover:opacity-100 ${dsFocus}`}
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

export function NotificationRowShell({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <div className="pr-7">{children}</div>
      <NotificationRowDismiss onDismiss={onDismiss} />
    </div>
  );
}

export function NotificationOpenLink({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={`${dsNotificationOpenLink} ${dsFocus}`}
    >
      {label}
    </button>
  );
}

export function NotificationEmptyState({
  variant = "neutral",
  title,
  description,
}: {
  variant?: "neutral" | "success";
  title?: string;
  description: string;
}) {
  if (variant === "success") {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-12 text-center" role="status">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--cab-success)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_14%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-success)_88%,var(--cab-text))]"
          aria-hidden
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <p className="text-sm font-semibold text-[color:color-mix(in_srgb,var(--cab-success)_88%,var(--cab-text))]">
          {title ?? "Tutto in regola"}
        </p>
        <p className="max-w-[16rem] text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{description}</p>
      </div>
    );
  }

  return (
    <div className="py-10 text-center" role="status">
      {title ? (
        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{title}</p>
      ) : null}
      <p className={`text-sm text-[color:var(--cab-text-muted)] ${title ? "mt-1" : ""}`}>{description}</p>
    </div>
  );
}

export function NotificationQtyChip({
  value,
  minLabel,
  valueAriaLabel,
}: {
  value: number;
  minLabel: string;
  valueAriaLabel: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5">
      <span className={dsNotificationQtyChip} aria-label={valueAriaLabel}>
        {value}
      </span>
      <span className={dsNotificationQtyChipCaption}>{minLabel}</span>
    </div>
  );
}

export function NotificationList({ children }: { children: ReactNode }) {
  return (
    <ul className={dsNotificationListClass} role="list">
      {children}
    </ul>
  );
}

export function NotificationDangerDetail({ children }: { children: ReactNode }) {
  return <p className={dsNotificationDangerDetailText}>{children}</p>;
}

export type NotificationBellActiveTone = "info" | "danger";

export function NotificationBellTrigger({
  buttonRef,
  count,
  active,
  activeTone = "info",
  ariaLabel,
  ariaExpanded,
  onClick,
  className = "",
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  count: number;
  active: boolean;
  activeTone?: NotificationBellActiveTone;
  ariaLabel: string;
  ariaExpanded: boolean;
  onClick: () => void;
  className?: string;
}) {
  const activeClass =
    active && activeTone === "danger"
      ? dsNotificationBellTriggerActiveDanger
      : active && activeTone === "info"
        ? dsNotificationBellTriggerActiveInfo
        : "";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className={[
        dsPageToolbarIconBtn,
        dsFocus,
        "relative min-h-[2.5rem] min-w-[2.5rem] overflow-visible",
        activeClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-expanded={ariaExpanded}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
    >
      <span className="relative inline-flex" aria-hidden>
        <NotificationBellIcon active={active} />
        {count > 0 ? <NotificationCountBadge count={count} /> : null}
      </span>
      <span className="sr-only">{ariaLabel}</span>
    </button>
  );
}

export function NotificationPanelHeader({
  title,
  titleId,
  count,
  subtitle,
  onClose,
}: {
  title: string;
  titleId: string;
  count?: number;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <header className="flex shrink-0 border-b border-[color:var(--cab-border)] px-3 py-2.5">
      <div className={dsModalHeaderInner}>
        <div className={dsModalHeaderLead}>
          <div className={dsModalTitleBlock}>
            <div className="flex min-w-0 items-center gap-2">
              <h2 id={titleId} className={`${dsModalTitle} text-sm`}>
                {title}
              </h2>
              {count != null && count > 0 ? (
                <span className={dsPageToolbarMetaChipAccent} aria-hidden>
                  {count}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className={dsModalSubtitle}>{subtitle}</p> : null}
          </div>
        </div>
        <CloseButton onClick={onClose} className={dsModalCloseBtn} />
      </div>
    </header>
  );
}

export function NotificationPanelShell({
  titleId,
  className = "",
  style,
  shellRef,
  onMouseDown,
  header,
  footer,
  children,
}: {
  titleId: string;
  className?: string;
  style?: CSSProperties;
  shellRef?: Ref<HTMLDivElement>;
  onMouseDown?: (e: MouseEvent) => void;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      ref={shellRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={`${dsNotificationPanelShell} ${dsScrollbar} ${className}`.trim()}
      style={style}
      onMouseDown={onMouseDown}
    >
      {header}
      <div className={`${dsNotificationPanelBody} ${dsScrollbar}`}>{children}</div>
      {footer}
    </div>
  );
}

export function NotificationPanelHint({ children }: { children: ReactNode }) {
  return <p className={dsNotificationPanelHint}>{children}</p>;
}

export function NotificationSottoScortaRow({
  descrizione,
  marca,
  scorta,
  scortaMinima,
  codice,
  deficit,
  unread = true,
  relativeTime,
  onClick,
  children,
}: {
  descrizione: string;
  marca: string;
  scorta: number;
  scortaMinima: number;
  codice?: string;
  deficit?: number;
  unread?: boolean;
  relativeTime?: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  const resolvedDeficit = deficit ?? Math.max(0, scortaMinima - scorta);
  const codiceLabel = codice?.trim() || undefined;

  return (
    <NotificationRowSurface
      as="button"
      unread={unread}
      severity="danger"
      onClick={onClick}
      className={`flex items-start gap-3 ${dsFocus}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {relativeTime ? (
          <div className="flex items-start justify-between gap-2">
            <p className={`min-w-0 ${dsNotificationRowTitle}`}>
              {unread ? <span className={dsNotificationUnreadDotClass("danger")} aria-hidden /> : null}
              Sotto scorta minima
            </p>
            <span className={dsNotificationRowTime}>{relativeTime}</span>
          </div>
        ) : null}
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[color:var(--cab-text)]">
          {descrizione.trim() || "—"}
        </p>
        <p className={`truncate ${dsNotificationDangerAccentText}`}>{marca.trim() || "—"}</p>
        {codiceLabel ? (
          <p className={`truncate font-mono text-[11px] tabular-nums ${dsNotificationRowMeta}`}>{codiceLabel}</p>
        ) : null}
        {resolvedDeficit > 0 ? (
          <NotificationDangerDetail>
            Mancano {resolvedDeficit} {resolvedDeficit === 1 ? "pezzo" : "pezzi"} rispetto al minimo
          </NotificationDangerDetail>
        ) : (
          <p className={dsNotificationRowMeta}>
            Quantità:{" "}
            <span className={dsNotificationRowMetaValue}>
              {scorta} / min {scortaMinima}
            </span>
          </p>
        )}
        {children}
      </div>
      <NotificationQtyChip
        value={scorta}
        minLabel={`min. ${scortaMinima}`}
        valueAriaLabel={`Giacenza ${scorta}`}
      />
    </NotificationRowSurface>
  );
}
