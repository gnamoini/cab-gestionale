/**
 * Policy layout sidebar — SSOT token, primitivo riga unico, niente animazioni layout.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const tokensSrc = read("lib/ui/sidebar-layout.ts");
const rowSrc = read("components/gestionale/sidebar-nav-row.tsx");
const globalsSrc = read("app/globals.css");
const appShellSrc = read("components/gestionale/app-shell.tsx");
const accountSrc = read("components/gestionale/account-menu.tsx");
const bellSrc = read("components/gestionale/notification-center-bell.tsx");
const routeTransitionSrc = read("src/lib/navigation/route-transition.ts");

assert.match(tokensSrc, /sidebarNavRowClass/);
assert.match(tokensSrc, /SIDEBAR_RAIL_WIDTH/);

assert.match(globalsSrc, /--cab-sidebar-row-height/);

assert.match(rowSrc, /SidebarNavRow/);
assert.match(rowSrc, /SidebarActiveIndicator/);
assert.match(rowSrc, /railTooltip/);
assert.match(rowSrc, /cab-sidebar-active-indicator/);

assert.match(globalsSrc, /--cab-sidebar-icon-anchor/);
assert.match(globalsSrc, /--cab-sidebar-trailing-width/);
assert.match(globalsSrc, /\.cab-sidebar-nav-row/);
assert.doesNotMatch(globalsSrc, /cab-sidebar-nav-link--rail-active/);
assert.doesNotMatch(globalsSrc, /grid-template-columns var\(--cab-sidebar-width-motion\)/);
assert.doesNotMatch(globalsSrc, /padding-inline-start var\(--cab-sidebar-width-motion\)/);

assert.match(appShellSrc, /SidebarNavRow/);
assert.doesNotMatch(appShellSrc, /railCollapsed/);
assert.doesNotMatch(appShellSrc, /sidebarNavLinkActiveRail/);

assert.match(accountSrc, /SidebarNavRow/);
assert.doesNotMatch(accountSrc, /sidebarNavLinkBase/);

assert.match(bellSrc, /SidebarNavRow/);
assert.match(bellSrc, /NotificationCountBadge/);
assert.doesNotMatch(bellSrc, /standaloneTrigger/);
assert.doesNotMatch(bellSrc, /embeddedTrigger/);

assert.match(routeTransitionSrc, /\.cab-sidebar-nav-row/);

console.log("sidebar-layout-policy.test.ts OK");
