/**
 * Policy UI notifiche: token condivisi, layout dropdown unificato, niente colori raw.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const magBellSrc = read("components/gestionale/magazzino/magazzino-giacenza-bell.tsx");
const adminBellSrc = read("components/dashboard/admin-notifications-bell.tsx");
const centerBellSrc = read("components/gestionale/notification-center-bell.tsx");
const designSystemIndexSrc = read("components/design-system/index.ts");
const primitivesSrc = read("components/design-system/notifications/notification-primitives.tsx");
const tokensSrc = read("lib/ui/notification-ui.ts");
const widgetSrc = read("components/dashboard/widgets/dashboard-magazzino-kpi-widget.tsx");

assert.match(tokensSrc, /NotificationSeverity/);
assert.match(tokensSrc, /dsNotificationRowSurface/);
assert.match(tokensSrc, /dsNotificationBellBadgeBase/);
assert.match(tokensSrc, /dsNotificationPanelWidthPx/);
assert.match(tokensSrc, /dsNotificationBellBadgeAnchorRail/);
assert.match(tokensSrc, /dsNotificationSidebarTrailingCount/);
assert.match(tokensSrc, /h-4 w-4 shrink-0 opacity-90/);
assert.match(tokensSrc, /dsNotificationPanelMaxHeightPx/);

assert.match(primitivesSrc, /NotificationBellIcon/);
assert.match(primitivesSrc, /dsNotificationBellBadgeAnchor/);
assert.doesNotMatch(primitivesSrc, /dsNotificationBellTriggerActiveDanger/);
assert.doesNotMatch(primitivesSrc, /relative inline-flex[\s\S]*NotificationCountBadge/);
assert.match(primitivesSrc, /fill="none"/);
assert.match(primitivesSrc, /strokeWidth=\{2\}/);
assert.match(primitivesSrc, /NotificationBellTrigger/);
assert.match(primitivesSrc, /NotificationPanelHeader/);
assert.match(primitivesSrc, /NotificationPanelShell/);
assert.match(primitivesSrc, /NotificationSottoScortaRow/);
assert.match(primitivesSrc, /NotificationRowSurface/);
assert.match(primitivesSrc, /NotificationEmptyState/);
assert.match(designSystemIndexSrc, /notification-primitives/);
assert.match(designSystemIndexSrc, /NotificationBellTrigger/);
assert.match(designSystemIndexSrc, /NotificationSottoScortaRow/);

assert.match(
  adminBellSrc,
  /@\/components\/design-system/,
  "admin bell must import notification primitives from design-system",
);
assert.match(adminBellSrc, /NotificationBellTrigger/);
assert.match(adminBellSrc, /Drawer/);
assert.match(adminBellSrc, /gestionaleLogPanelAsideClass/);
assert.match(adminBellSrc, /GestionaleLogList/);
assert.match(adminBellSrc, /LogEntry/);
assert.match(adminBellSrc, /toAdminNotificationLogViewModel/);
assert.match(adminBellSrc, /NotificationsPanelFooter/);
assert.doesNotMatch(adminBellSrc, /useGlobalDropdownPortal/);
assert.doesNotMatch(adminBellSrc, /createPortal/);
assert.doesNotMatch(adminBellSrc, /NotificationPanelShell/);
assert.doesNotMatch(adminBellSrc, /bg-red-600/);
assert.doesNotMatch(adminBellSrc, /text-zinc-/);

assert.match(
  centerBellSrc,
  /@\/components\/design-system/,
  "notification center must import notification primitives from design-system",
);
assert.match(centerBellSrc, /NotificationBellIcon/);
assert.match(centerBellSrc, /SidebarNavRow/);
assert.match(centerBellSrc, /cab-notification-bell--arrive/);
assert.match(centerBellSrc, /NotificationCountBadge/);
assert.match(centerBellSrc, /variant="rail"/);
assert.doesNotMatch(centerBellSrc, /cab-sidebar-session-icon-btn/);
assert.match(centerBellSrc, /Drawer/);
assert.match(centerBellSrc, /gestionaleLogPanelAsideClass/);
assert.match(centerBellSrc, /Elimina tutte/);
assert.match(centerBellSrc, /dismissAllNotifications/);
assert.match(centerBellSrc, /gestionaleLogDrawerScrollInsetClass/);
assert.match(centerBellSrc, /LogEntry/);
assert.match(centerBellSrc, /toInboxNotificationLogViewModel/);
assert.match(centerBellSrc, /NotificationsPanelFooter/);
assert.doesNotMatch(centerBellSrc, /useGlobalDropdownPortal/);
assert.doesNotMatch(centerBellSrc, /createPortal/);
assert.doesNotMatch(centerBellSrc, /NotificationPanelShell/);
assert.doesNotMatch(centerBellSrc, /bg-red-600/);

assert.match(
  magBellSrc,
  /@\/components\/design-system/,
  "magazzino bell must import notification primitives from design-system",
);
assert.match(magBellSrc, /NotificationBellTrigger/);
assert.match(magBellSrc, /Drawer/);
assert.match(magBellSrc, /gestionaleLogPanelAsideClass/);
assert.match(magBellSrc, /GestionaleLogList/);
assert.match(magBellSrc, /LogEntry/);
assert.match(magBellSrc, /toMagazzinoSottoScortaLogViewModel/);
assert.doesNotMatch(magBellSrc, /useGlobalDropdownPortal/);
assert.doesNotMatch(magBellSrc, /createPortal/);
assert.doesNotMatch(magBellSrc, /NotificationPanelShell/);
assert.doesNotMatch(magBellSrc, /NotificationSottoScortaRow/);
assert.doesNotMatch(magBellSrc, /GestionaleModalShell/);
assert.doesNotMatch(magBellSrc, /GestionaleModalScrollBody/);
assert.doesNotMatch(magBellSrc, /hidden truncate text-xs font-semibold sm:inline/);
assert.match(primitivesSrc, /NotificationBellTrigger[\s\S]*?dsFocus/);
assert.doesNotMatch(magBellSrc, /border-red-/);
assert.doesNotMatch(magBellSrc, /text-zinc-/);
assert.doesNotMatch(magBellSrc, /erpFocus/);
assert.doesNotMatch(magBellSrc, /bg-red-/);
assert.doesNotMatch(magBellSrc, /emerald-/);

assert.match(widgetSrc, /dsNotificationWidgetDangerRow/);
assert.match(widgetSrc, /dsNotificationWidgetDangerChip/);
assert.doesNotMatch(widgetSrc, /magSottoScortaPillHex/);
assert.match(
  widgetSrc,
  /sottoPreview\.map[\s\S]*?dsNotificationWidgetDangerRow/,
  "sotto scorta widget row must use shared danger tokens",
);

console.log("notification-ui-policy.test.ts OK");
