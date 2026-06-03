/**
 * Struttura toolbar: PageToolbar compone ToolbarGroup; drawer mobile + overflow Altro.
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
const headerToolbar = read("components/gestionale/page-header-toolbar.tsx");

assert.match(pageToolbar, /from "@\/components\/design-system\/toolbar-group"/);
assert.match(pageToolbar, /ToolbarGroup/);
assert.match(pageToolbar, /ToolbarGroupSearchRow/);
assert.match(pageToolbar, /ToolbarGroupPrimaryRow/);
assert.match(pageToolbar, /ToolbarGroupFiltersToggle/);
assert.match(pageToolbar, /ToolbarGroupMetaRow/);
assert.match(pageToolbar, /ToolbarGroupFiltersCollapse/);
assert.match(pageToolbar, /MobileFilterDrawer/);
assert.match(pageToolbar, /overflowActions/);
assert.match(pageToolbar, /PageToolbarCtaLabel/);
assert.match(pageToolbar, /useSmUp/);

assert.match(toolbarGroup, /export function ToolbarGroup/);
assert.match(toolbarGroup, /dsPageToolbar/);
assert.doesNotMatch(toolbarGroup, /\bdsStickyToolbar\b/);
assert.match(toolbarGroup, /grid-rows-\[1fr\]/);
assert.match(toolbarGroup, /grid-rows-\[0fr\]/);
assert.match(toolbarGroup, /ToolbarGroupMetaRow/);
assert.match(toolbarGroup, /ToolbarGroupSearchRow/);
assert.match(toolbarGroup, /ToolbarGroupSearchRow[\s\S]*min-w-0 w-full/);
assert.match(toolbarGroup, /ToolbarGroupPrimaryRow[\s\S]*sm:justify-between/);
assert.match(pageToolbar, /flex-col items-stretch gap-2 sm:hidden/);
assert.match(pageToolbar, /ToolbarGroupPrimaryRow className="hidden sm:flex sm:flex-nowrap sm:justify-start"/);
assert.match(pageToolbar, /shrink-0">\{primaryAction\}/);
assert.match(pageToolbar, /min-w-0 flex-1">\{search\}/);
assert.match(toolbarGroup, /ToolbarGroupUtilityRow/);
assert.match(toolbarGroup, /ToolbarGroupOverflowToggle/);
assert.match(toolbarGroup, /hidden min-w-0[\s\S]*sm:grid/);
assert.doesNotMatch(toolbarGroup, /\bsticky\s+top-/);

assert.match(dsIndex, /ToolbarGroupOverflowToggle/);
assert.match(dsIndex, /PageToolbarCtaLabel/);

assert.match(headerToolbar, /overflowActions/);
assert.match(headerToolbar, /MobileFilterDrawer/);

console.log("toolbar-structure.test.ts OK");
