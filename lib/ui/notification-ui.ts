/** Token UI condivisi — notifiche Dashboard e avvisi Magazzino (solo presentazione). */

export type NotificationSeverity = "info" | "warning" | "danger" | "success";

export const dsNotificationRowBase =
  "w-full rounded-[var(--ds-radius-xl)] border px-3.5 py-3 text-left shadow-[var(--cab-shadow-sm)] transition-[background-color,border-color,box-shadow] duration-200";

export const dsNotificationRowTitle =
  "text-xs font-semibold leading-snug text-[color:var(--cab-text)]";

export const dsNotificationRowMeta =
  "text-xs leading-snug text-[color:var(--cab-text-muted)]";

export const dsNotificationRowMetaValue =
  "font-medium text-[color:var(--cab-text)]";

export const dsNotificationRowTime =
  "shrink-0 text-[10px] leading-snug tabular-nums text-[color:var(--cab-text-muted)]";

export const dsNotificationOpenLink =
  "mt-1.5 text-[11px] font-medium leading-snug text-[color:color-mix(in_srgb,var(--cab-primary)_65%,var(--cab-text-muted))] hover:underline";

export const dsNotificationBellIcon = "h-4 w-4 shrink-0 opacity-90";

/** Campanella header PageActionMenu (allineata a refresh/back). */
export const dsNotificationBellIconHeader = "h-5 w-5 shrink-0";

/** Campanella nella rail sidebar (shell 28px). */
export const dsNotificationBellIconRail = "h-[0.9375rem] w-[0.9375rem] shrink-0";

/** Ancoraggio badge sul bottone 40×40 (non sul wrapper icona). */
export const dsNotificationBellBadgeAnchor =
  "pointer-events-none absolute right-0.5 top-0.5 z-[1]";

/** Ancoraggio badge sulla shell icona sidebar (28px) — sporge in alto a destra. */
export const dsNotificationBellBadgeAnchorRail =
  "cab-sidebar-notification-badge pointer-events-none absolute -right-1 -top-1 z-[2]";

export const dsNotificationBellBadgeBase =
  "flex items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-danger)_92%,#000)] font-bold tabular-nums leading-none text-white ring-2 ring-[var(--cab-surface)]";

export const dsNotificationBellBadgeBaseRail =
  "flex items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-danger)_94%,#000)] font-bold tabular-nums leading-none text-white shadow-[0_1px_2px_color-mix(in_srgb,#000_25%,transparent)] ring-2 ring-[var(--cab-card)]";

export const dsNotificationBellBadgeCompact = "size-4 text-[9px]";

export const dsNotificationBellBadgeWide = "h-4 min-w-[1.125rem] px-0.5 text-[8px]";

export const dsNotificationBellBadgeRailCompact = "size-[1.125rem] min-w-[1.125rem] text-[10px]";

export const dsNotificationBellBadgeRailWide = "h-[1.125rem] min-w-[1.3125rem] px-0.5 text-[9px]";

/** Contatore in trailing (sidebar espansa) — pill piena, allineata alla colonna fissa. */
export const dsNotificationSidebarTrailingCount =
  "cab-sidebar-notification-trailing-count inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-danger)_94%,#000)] px-1 text-[11px] font-bold tabular-nums leading-none text-white shadow-[0_1px_2px_color-mix(in_srgb,#000_22%,transparent)] ring-2 ring-[var(--cab-card)]";

export const dsNotificationSidebarTrailingCountWide =
  "h-5 min-w-[1.375rem] px-1 text-[10px]";

export const dsNotificationPanelShell =
  "flex min-w-0 flex-col overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-lg)]";

/** Larghezza pannello dropdown notifiche (allineata a campanella Dashboard). */
export const dsNotificationPanelWidthPx = 352;

export const dsNotificationPanelMinWidthPx = 280;

/** Altezza max area lista + header nel cap del pannello. */
export const dsNotificationPanelMaxHeightPx = 480;

export const dsNotificationPanelBody =
  "min-h-0 min-w-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-3";

export const dsNotificationPanelHint =
  "text-xs leading-relaxed text-[color:var(--cab-text-muted)]";

export const dsNotificationListClass = "space-y-2.5";

export const dsNotificationQtyChip =
  "inline-flex h-11 w-11 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_14%,var(--cab-surface))] font-mono text-lg font-bold tabular-nums text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))] ring-2 ring-[var(--cab-card)]";

export const dsNotificationQtyChipCaption =
  "text-[10px] font-semibold tabular-nums text-[color:var(--cab-text-muted)]";

export const dsNotificationDangerAccentText =
  "font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]";

export const dsNotificationDangerDetailText =
  "text-[11px] font-medium tabular-nums text-[color:color-mix(in_srgb,var(--cab-danger)_82%,var(--cab-text))]";

export const dsNotificationWidgetDangerRow =
  "flex min-w-0 items-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_38%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] px-2.5 py-2 shadow-[var(--cab-shadow-sm)]";

export const dsNotificationWidgetDangerChip =
  "inline-flex shrink-0 rounded-md border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]";

export const dsNotificationWidgetSuccessChip =
  "inline-flex shrink-0 rounded-md border border-[color:color-mix(in_srgb,var(--cab-success)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_10%,var(--cab-surface))] px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-[color:color-mix(in_srgb,var(--cab-success)_88%,var(--cab-text))]";

const dsNotificationDesktopStatusBase =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98]";

/** Badge stato notifiche desktop nel drawer notifiche (cliccabile = test). */
export const dsNotificationDesktopStatusActive = `${dsNotificationDesktopStatusBase} border-[color:color-mix(in_srgb,var(--cab-success)_42%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_14%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-success)_94%,var(--cab-text))] shadow-[0_1px_2px_color-mix(in_srgb,#000_14%,transparent)] hover:border-[color:color-mix(in_srgb,var(--cab-success)_50%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-success)_20%,var(--cab-surface))]`;

export const dsNotificationDesktopStatusInactive = `${dsNotificationDesktopStatusBase} border-[color:color-mix(in_srgb,var(--cab-danger)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-danger)_90%,var(--cab-text))] shadow-[0_1px_2px_color-mix(in_srgb,#000_14%,transparent)] hover:border-[color:color-mix(in_srgb,var(--cab-danger)_48%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_18%,var(--cab-surface))]`;

export const dsNotificationDesktopStatusDotActive =
  "h-1.5 w-1.5 shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--cab-success)_92%,var(--cab-text))] ring-2 ring-[color:color-mix(in_srgb,var(--cab-success)_28%,transparent)]";

export const dsNotificationDesktopStatusDotInactive =
  "h-1.5 w-1.5 shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))] ring-2 ring-[color:color-mix(in_srgb,var(--cab-danger)_24%,transparent)]";

export function formatNotificationCountBadge(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export function dsNotificationRowSurface(opts: {
  unread?: boolean;
  severity?: NotificationSeverity;
  interactive?: boolean;
}): string {
  const { unread = false, severity = "info", interactive = true } = opts;
  const parts = [dsNotificationRowBase];

  if (severity === "danger") {
    parts.push(
      unread
        ? "border-[color:color-mix(in_srgb,var(--cab-danger)_48%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_14%,var(--cab-card))]"
        : "border-[color:color-mix(in_srgb,var(--cab-danger)_32%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))]",
    );
    if (interactive) {
      parts.push(
        "hover:border-[color:color-mix(in_srgb,var(--cab-danger)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_16%,var(--cab-card))] active:scale-[0.995]",
      );
    }
  } else if (unread) {
    parts.push(
      "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))]",
    );
  } else {
    parts.push(
      "border-[color:var(--cab-border)] bg-[var(--cab-card)]",
    );
    if (interactive) {
      parts.push("hover:bg-[var(--cab-surface-muted)]");
    }
  }

  return parts.join(" ");
}

export function dsNotificationUnreadDotClass(severity: NotificationSeverity = "info"): string {
  const color =
    severity === "danger"
      ? "bg-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]"
      : "bg-[color:var(--cab-primary)]";
  return `mr-1.5 inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full align-middle ${color}`;
}
