/**
 * Contratto API PageActionMenu — SSOT overflow header.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const barrel = read("components/ui/index.ts");
const types = read("components/ui/page-action-menu/page-action-menu-types.ts");
const menu = read("components/ui/page-action-menu/PageActionMenu.tsx");
const provider = read("components/ui/page-action-menu/PageActionMenuProvider.tsx");
const contracts = read("lib/ui-design-system-lock/component-contracts.ts");
const adr = read("docs/adr/ADR-003-page-action-menu.md");

assert.match(barrel, /PageActionMenu/);
assert.match(barrel, /usePageActionMenu/);
assert.match(barrel, /PageActionMenuProvider/);

assert.match(types, /pageKey\?:/);
assert.match(types, /requireWrite\?:/);
assert.match(types, /featureFlag\?:/);
assert.match(types, /submenu\?:/);

assert.match(menu, /data-testid="page-action-menu-trigger"/);
assert.match(menu, /role="menu"/);
assert.match(menu, /filterPageActionItems/);
assert.match(menu, /pageActionMenuHasContent/);
assert.match(menu, /e\.key !== "a"/);

assert.match(provider, /registerGroup/);
assert.match(provider, /mergePageActionGroups/);

assert.match(contracts, /PageActionMenu: "1.0.0"/);
assert.match(contracts, /PAGE_ACTION_MENU_CONTRACT/);

assert.match(adr, /PageActionMenu/);

console.log("page-action-menu-contract.test.ts OK");
