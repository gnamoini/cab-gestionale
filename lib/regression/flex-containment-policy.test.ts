/**
 * Flex containment policy — token centrali + heuristic su className con flex-1.
 *
 * Target audit DEV: zero [flex-child-missing-min-w-0] su route operative.
 * Score layout stability post-sweep: ~90/100 (vedi piano flex containment).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// --- Token centrali ---
const toolbarGroup = read("components/design-system/toolbar-group.tsx");
const designSystem = read("lib/ui/design-system.ts");
const modalBody = read("lib/ui/modal-max-width-class.ts");
const scrollPanel = read("lib/ui/scroll-system.ts");
const globalTable = read("lib/ui/global-table.ts");
const globalsCoreCss = read("app/globals-core.css");
const globalsShellCss = read("app/globals-gestionale-shell.css");
const globalFlexSystem = read("lib/ui/global-flex-system.ts");

assert.match(toolbarGroup, /ToolbarGroup[\s\S]*min-w-0 max-w-full/);
assert.match(toolbarGroup, /ToolbarGroupPrimaryRow[\s\S]*\[&>\*\]:min-w-0/);
assert.match(toolbarGroup, /flex-safe-row/);
assert.doesNotMatch(toolbarGroup, /data-flex-safe-wrap/);
assert.match(designSystem, /dsSurfaceCard[\s\S]*min-w-0 max-w-full/);
assert.match(designSystem, /dsModalBackdrop[\s\S]*overflow-x-hidden/);
assert.match(designSystem, /dsModalPanel[\s\S]*min-w-0 max-w-full overflow-x-hidden/);
assert.match(designSystem, /dsLavorazioniModalDialog[\s\S]*min-w-0 max-w-full overflow-x-hidden/);
assert.match(modalBody, /gestionaleModalBodyFlexClass[\s\S]*min-w-0/);
assert.match(scrollPanel, /dsScrollPanel[\s\S]*min-w-0/);
assert.match(globalTable, /globalTableWrap[\s\S]*min-w-0 max-w-full/);
assert.match(globalTable, /globalTableTheadClass[\s\S]*min-w-0/);
assert.match(globalTable, /globalTableTdBody[\s\S]*min-w-0/);
assert.match(globalTable, /globalTableThCell[\s\S]*min-w-0/);
assert.match(globalTable, /globalTableHeadEdgeInset[\s\S]*min-w-0/);

assert.match(globalsCoreCss, /\.flex-safe\s*\{/);
assert.match(globalsCoreCss, /\.flex-safe-row\s*\{/);
assert.match(globalsCoreCss, /\.flex-fill,\s*\n?\s*\.flex-fill-safe\s*\{/);
assert.match(globalsCoreCss, /\.text-safe\s*\{/);
assert.match(globalsCoreCss, /\.flex-fill-safe\s*\{/);
assert.match(globalsShellCss, /gestionale-responsive-core \.flex > \*/);
assert.doesNotMatch(globalsShellCss, /gestionale-responsive-core[\s\S]*flex-wrap:\s*wrap/);

assert.match(globalFlexSystem, /flexSafeRow = "flex-safe-row"/);
assert.match(globalFlexSystem, /flexFillSafe = "flex-fill-safe"/);

console.log("flex-containment-policy.test.ts OK");
