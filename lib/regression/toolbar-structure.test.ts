/**
 * Struttura toolbar liste: PageToolbar = primaryAction + search + filtri + meta + overflow.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const pageToolbar = read("components/design-system/page-toolbar.tsx");
const toolbarGroup = read("components/design-system/toolbar-group.tsx");
const dsIndex = read("components/design-system/index.ts");
const pageActionMenu = read("components/ui/page-action-menu/PageActionMenu.tsx");

assert.match(pageToolbar, /from "@\/components\/design-system\/toolbar-group"/);
assert.match(pageToolbar, /ToolbarGroup/);
assert.match(pageToolbar, /ToolbarGroupSearchRow/);
assert.match(pageToolbar, /ToolbarGroupMetaRow/);
assert.match(pageToolbar, /ToolbarGroupFiltersCollapse/);
assert.match(pageToolbar, /ToolbarGroupFiltersToggle/);
assert.match(pageToolbar, /ToolbarGroupOverflowToggle/);
assert.match(pageToolbar, /primaryAction/);
assert.match(pageToolbar, /overflowActions/);
assert.match(pageToolbar, /MobileFilterDrawer/);
assert.match(pageToolbar, /PageToolbarCtaLabel/);
assert.match(pageToolbar, /aria-label=\{countAriaLabel\}/);
assert.match(pageToolbar, /dsPageToolbarMetaChip.*sm:hidden/);

assert.match(toolbarGroup, /export function ToolbarGroup/);
assert.match(toolbarGroup, /dsPageToolbar/);
assert.doesNotMatch(toolbarGroup, /\bdsStickyToolbar\b/);

assert.match(dsIndex, /PageToolbarCtaLabel/);

assert.match(pageActionMenu, /page-action-menu-trigger/);
assert.doesNotMatch(pageActionMenu, /GestionaleMobileBottomSheet/);
assert.match(pageActionMenu, /useGlobalDropdownPortal/);
assert.match(pageActionMenu, /bottom-end/);

console.log("toolbar-structure.test.ts OK");
