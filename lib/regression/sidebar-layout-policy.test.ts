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
const globalsShellSrc = read("app/globals-gestionale-shell.css");
const appShellSidebarSrc = read("components/gestionale/app-shell-sidebar.tsx");
const appShellSrc = read("components/gestionale/app-shell.tsx");
const accountSrc = read("components/gestionale/account-menu.tsx");
const bellSrc = read("components/gestionale/notification-center-bell.tsx");
const routeTransitionSrc = read("src/lib/navigation/route-transition.ts");

assert.match(tokensSrc, /sidebarNavRowClass/);
assert.match(tokensSrc, /SIDEBAR_RAIL_WIDTH/);

assert.match(globalsShellSrc, /--cab-sidebar-row-height/);

assert.match(rowSrc, /SidebarNavRow/);
assert.match(rowSrc, /SidebarActiveIndicator/);
assert.match(rowSrc, /railTooltip/);
assert.match(rowSrc, /cab-sidebar-active-indicator/);

assert.match(globalsShellSrc, /--cab-sidebar-icon-anchor/);
assert.match(globalsShellSrc, /--cab-sidebar-trailing-width/);
assert.match(globalsShellSrc, /\.cab-sidebar-nav-row/);
assert.doesNotMatch(globalsShellSrc, /cab-sidebar-nav-link--rail-active/);
assert.doesNotMatch(globalsShellSrc, /grid-template-columns var\(--cab-sidebar-width-motion\)/);
assert.doesNotMatch(globalsShellSrc, /padding-inline-start var\(--cab-sidebar-width-motion\)/);

assert.match(appShellSidebarSrc, /SidebarNavRow/);
assert.match(appShellSidebarSrc, /onOpenInbox=\{collapseSidebar\}/);
assert.match(appShellSrc, /AppShellSidebar/);
assert.doesNotMatch(appShellSidebarSrc, /railCollapsed/);
assert.doesNotMatch(appShellSidebarSrc, /sidebarNavLinkActiveRail/);

assert.match(accountSrc, /SidebarNavRow/);
assert.doesNotMatch(accountSrc, /sidebarNavLinkBase/);

assert.match(bellSrc, /SidebarNavRow/);
assert.match(bellSrc, /NotificationCountBadge/);
assert.doesNotMatch(bellSrc, /standaloneTrigger/);
assert.doesNotMatch(bellSrc, /embeddedTrigger/);

assert.match(routeTransitionSrc, /\.cab-sidebar-nav-row/);

console.log("sidebar-layout-policy.test.ts OK");
