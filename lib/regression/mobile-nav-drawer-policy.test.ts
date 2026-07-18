import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NAV_DRAWER_CONTRACT_TRANSITIONS } from "@/lib/ui/mobile-nav-drawer-contract";

const root = process.cwd();

assert.ok(NAV_DRAWER_CONTRACT_TRANSITIONS.length > 0);

const contractDoc = readFileSync(join(root, "docs/mobile-nav-drawer-contract.md"), "utf8");
assert.match(contractDoc, /Interaction Contract/);
assert.match(contractDoc, /EDGE_ZONE_RATIO/);

const machineSrc = readFileSync(join(root, "lib/ui/mobile-nav-drawer-machine.ts"), "utf8");
for (const row of NAV_DRAWER_CONTRACT_TRANSITIONS.slice(0, 8)) {
  assert.match(machineSrc, new RegExp(`"${row.event}"`));
}

const sidebarSrc = readFileSync(join(root, "components/gestionale/app-shell-sidebar.tsx"), "utf8");
assert.doesNotMatch(
  sidebarSrc,
  /\[activePath,\s*collapseSidebar,\s*drawer,/,
  "route effect must not depend on unstable drawer object",
);
assert.doesNotMatch(
  sidebarSrc,
  /\[drawer,\s*isCompactShell\]/,
  "tier forceClose effect must not depend on unstable drawer object",
);
assert.match(sidebarSrc, /useBodyScrollLock/);
assert.match(sidebarSrc, /useDialogFocusTrap/);
assert.match(sidebarSrc, /useOverlayBackHandler/);
assert.match(sidebarSrc, /cab-nav-drawer-backdrop[\s\S]*touch-none/);
assert.match(sidebarSrc, /touch-pan-y/);
assert.match(sidebarSrc, /id=\{NAV_DRAWER_PANEL_ID\}/);
assert.match(sidebarSrc, /DISMISS_DRAG_END_COMMIT/);
assert.match(sidebarSrc, /skipCssCloseAnim/);
assert.match(sidebarSrc, /edgeSnapVisuallyClosed/);

const openBtnSrc = readFileSync(join(root, "components/gestionale/mobile-nav-open-button.tsx"), "utf8");
assert.match(openBtnSrc, /aria-expanded/);
assert.match(openBtnSrc, /aria-controls/);

const cssSrc = readFileSync(join(root, "app/globals-core.css"), "utf8");
assert.match(cssSrc, /cab-nav-drawer-locked/);
assert.match(cssSrc, /will-change: transform/);

const shellCssSrc = readFileSync(join(root, "app/globals-gestionale-shell.css"), "utf8");
assert.doesNotMatch(
  shellCssSrc,
  /\.cab-nav-drawer-panel\.cab-sidebar \.cab-sidebar-active-indicator[\s\S]{0,80}display:\s*none/,
);
assert.doesNotMatch(shellCssSrc, /box-shadow: inset 0 0 0 1px color-mix\(in srgb, var\(--cab-primary\)/);
assert.match(
  shellCssSrc,
  /\.cab-nav-drawer-panel\.cab-sidebar \.cab-sidebar-nav-row--active \{[\s\S]*?background-color: rgb\(244 244 245/,
);
assert.match(shellCssSrc, /\.cab-sidebar-active-indicator/);

console.log("mobile-nav-drawer-policy.test.ts ok");
