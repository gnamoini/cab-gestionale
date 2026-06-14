import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const grid = read("components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx");
const compactCell = read("components/gestionale/dipendenti/dipendenti-timesheet-compact-cell.tsx");
const layout = read("lib/dipendenti/timesheet-grid-layout.ts");
const css = read("components/gestionale/global-table/gestionale-list-table.css");

assert.doesNotMatch(grid, /min-w-max/, "timesheet grid must not use min-w-max (content-driven expansion)");
assert.match(grid, /<colgroup/, "timesheet grid must declare colgroup for fixed column budget");
assert.match(grid, /timesheet-grid-layout/, "timesheet grid must import layout SSOT");
assert.match(grid, /TIMESHEET_UI_TABLE_CLASS/, "timesheet grid must use table-fixed layout class");
assert.match(
  layout,
  /TIMESHEET_UI_TABLE_CLASS[\s\S]*?w-full/,
  "timesheet table must stretch to available width",
);
assert.match(grid, /computeTimesheetUiTableWidthRemFromDays/, "timesheet grid must set min table width from column budget");
assert.match(grid, /dayColumnLayouts/, "timesheet grid must compute per-day column layout");
assert.match(grid, /data-timesheet-weekend-compact/, "empty weekend columns must expose compact data attr");
assert.match(grid, /minWidth: `\$\{tableWidthRem\}rem`/, "timesheet grid must keep horizontal scroll floor");
assert.match(grid, /width: "100%"/, "timesheet table must fill scroll container");
assert.match(grid, /overscroll-contain/, "timesheet grid must contain scroll to avoid page scrollbar");
assert.match(grid, /timesheet-presenze-highlight-layer/, "today highlight must render on detached overlay layer");
assert.match(grid, /timesheet-presenze-shell/, "timesheet must use shell wrapper for clipped highlight");
assert.match(grid, /timesheet-presenze-shell[\s\S]*?w-full/, "timesheet shell must use full available width");
assert.match(grid, /timesheet-presenze-grid[\s\S]*?w-full/, "timesheet scroll grid must use full available width");
assert.match(grid, /timesheetDayColumnClass/, "day cells must use layout-driven column class");
assert.match(grid, /data-timesheet-fixed="name"/, "colgroup must pin name column width via CSS");

assert.match(compactCell, /data-timesheet-cell-kind/, "filled cells expose kind for square td paint");
assert.match(compactCell, /rounded-none/, "timesheet cell button must have zero radius");
assert.doesNotMatch(compactCell, /active:scale/, "timesheet cell must not scale on press");
assert.doesNotMatch(compactCell, /shrink-0/, "compact cell must not block column shrink");
assert.doesNotMatch(compactCell, /min-w-\[2\.5rem\]/, "compact cell must not enforce min width floor");

assert.match(layout, /TIMESHEET_UI_WEEKEND_EMPTY_COL_REM/, "layout SSOT must export compact weekend width");
assert.match(layout, /computeTimesheetUiTableWidthRemFromDays/, "layout SSOT must export width helper with compact weekends");
assert.match(layout, /timesheetDayColumnClass/, "layout SSOT must map day layout to column class");

assert.match(css, /\.timesheet-presenze-grid table\s*\{[^}]*table-layout:\s*fixed/, "CSS must enforce table-layout fixed");
assert.match(css, /col\[data-timesheet-fixed="name"\]/, "CSS must pin name col width");
assert.match(css, /col\[data-timesheet-weekend-compact="true"\]/, "CSS must pin compact weekend col width");
assert.match(css, /th\[data-timesheet-weekend-compact="true"\][\s\S]*padding-left:\s*0 !important/, "compact weekend header must drop horizontal padding");
assert.match(css, /data-timesheet-cell-kind="absence"/, "CSS must paint filled cells on td via cell kind");
assert.match(
  css,
  /:not\(:has\(> button\[data-timesheet-cell-kind\]\)\)/,
  "crosshair must not gray-out filled day cells",
);
assert.match(css, /border-radius:\s*0 !important/, "CSS must force square day cells");
assert.doesNotMatch(
  css,
  /\.timesheet-presenze-grid\s*\{[^}]*scrollbar-gutter:\s*stable/,
  "timesheet grid must not reserve stable scrollbar gutter",
);
assert.match(css, /\.timesheet-presenze-highlight-layer/, "CSS must define highlight overlay layer");
assert.match(
  css,
  /\.timesheet-presenze-shell\s*\{[^}]*--timesheet-today-edge/,
  "today edge token must live on shell for highlight layer inheritance",
);

console.log("timesheet-grid-layout-audit.test.ts OK");
