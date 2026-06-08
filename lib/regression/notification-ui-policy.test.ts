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
const designSystemIndexSrc = read("components/design-system/index.ts");
const primitivesSrc = read("components/design-system/notifications/notification-primitives.tsx");
const tokensSrc = read("lib/ui/notification-ui.ts");
const widgetSrc = read("components/dashboard/dashboard-operational-cards.tsx");

assert.match(tokensSrc, /NotificationSeverity/);
assert.match(tokensSrc, /dsNotificationRowSurface/);
assert.match(tokensSrc, /dsNotificationBellBadgeBase/);
assert.match(tokensSrc, /dsNotificationPanelWidthPx/);
assert.match(tokensSrc, /dsNotificationBellBadgeAnchor/);
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
assert.match(adminBellSrc, /NotificationPanelShell/);
assert.match(adminBellSrc, /NotificationPanelHeader/);
assert.match(adminBellSrc, /NotificationList/);
assert.match(adminBellSrc, /NotificationSottoScortaRow/);
assert.match(adminBellSrc, /useGlobalDropdownPortal/);
assert.match(adminBellSrc, /createPortal/);
assert.doesNotMatch(adminBellSrc, /bg-red-600/);
assert.doesNotMatch(adminBellSrc, /text-zinc-/);

assert.match(
  magBellSrc,
  /@\/components\/design-system/,
  "magazzino bell must import notification primitives from design-system",
);
assert.match(magBellSrc, /NotificationBellTrigger/);
assert.match(magBellSrc, /NotificationPanelShell/);
assert.match(magBellSrc, /NotificationPanelHeader/);
assert.match(magBellSrc, /NotificationSottoScortaRow/);
assert.match(magBellSrc, /useGlobalDropdownPortal/);
assert.match(magBellSrc, /createPortal/);
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
  /function MagazzinoSottoScortaListItem[\s\S]*?dsNotificationWidgetDangerRow/,
  "sotto scorta widget row must use shared danger tokens",
);

console.log("notification-ui-policy.test.ts OK");
