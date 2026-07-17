/**
 * Global Flex System — policy SSOT + CSS scoped invariants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GlobalFlexSystem,
  flexFillSafe,
  flexSafeCol,
  flexSafeItem,
  flexSafeRow,
  FLEX_OVERFLOW_FILE_ALLOWLIST,
  FLEX_SCOPE_CLASS,
} from "@/lib/ui/global-flex-system";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const gfs = read("lib/ui/global-flex-system.ts");
const globalsCoreCss = read("app/globals-core.css");
const globalsShellCss = read("app/globals-gestionale-shell.css");
const toolbarGroup = read("components/design-system/toolbar-group.tsx");
const designSystem = read("lib/ui/design-system.ts");
const globalTable = read("lib/ui/global-table.ts");

assert.match(gfs, /export const GlobalFlexSystem/);
assert.match(gfs, /flexSafeItem = "flex-safe-item"/);
assert.match(gfs, /flexFillSafe = "flex-fill-safe"/);
assert.equal(GlobalFlexSystem.scopeClass, FLEX_SCOPE_CLASS);
assert.equal(GlobalFlexSystem.flexSafeRow, flexSafeRow);
assert.equal(GlobalFlexSystem.flexSafeCol, flexSafeCol);
assert.equal(GlobalFlexSystem.flexSafeItem, flexSafeItem);
assert.equal(GlobalFlexSystem.flexFillSafe, flexFillSafe);
assert.ok(FLEX_OVERFLOW_FILE_ALLOWLIST.some((a) => a.path.includes("lavorazioni-kanban-view")));

assert.match(globalsCoreCss, /\.flex-safe-item\s*\{/);
assert.match(globalsCoreCss, /\.flex-fill-safe\s*\{/);
assert.match(globalsShellCss, new RegExp(`${FLEX_SCOPE_CLASS} \\.flex > \\*`));
assert.doesNotMatch(
  globalsShellCss,
  /gestionale-responsive-core[\s\S]*flex-wrap:\s*wrap/,
  "NO flex-wrap globale scoped su .gestionale-responsive-core",
);

assert.match(toolbarGroup, /flex-safe-row/);
assert.doesNotMatch(toolbarGroup, /data-flex-safe-wrap/);
assert.match(designSystem, /dsModalPanel[\s\S]*min-w-0 max-w-full overflow-x-hidden/);
assert.match(globalTable, /globalTableWrap[\s\S]*min-w-0[\s\S]*overflow-x-auto/);

console.log("flex-system-policy.test.ts OK");
