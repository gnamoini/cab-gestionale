/**
 * RBAC filter per PageActionMenu items.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  filterPageActionItems,
  getSingletonPageActionListItem,
  isRefreshOnlyPageActionMenu,
  pageActionMenuHasAttention,
  pageActionMenuHasContent,
  shouldUsePageActionMenuDropdown,
} from "@/components/ui/page-action-menu/page-action-menu-permissions";

const ctx = {
  rbac: {
    canReadPage: (k: string) => k !== "sicurezza",
    canWritePage: (k: string) => k === "lavorazioni",
    isAdmin: false,
  },
  perms: {
    global: { isAdmin: false },
    modules: {
      mezzi: { canRead: true, canWrite: true, isLoading: false },
      magazzino: { canRead: true, canWrite: false, isLoading: false },
    },
  },
} as unknown as Parameters<typeof filterPageActionItems>[1];

const out = filterPageActionItems(
  [
    { id: "sec", label: "Sec", pageKey: "sicurezza", requireWrite: true },
    { id: "lav", label: "Lav", pageKey: "lavorazioni", requireWrite: true },
    { id: "mezzi", label: "Mezzi", module: "mezzi", requireWrite: true },
    { id: "mag", label: "Mag", module: "magazzino", requireWrite: true },
    { id: "admin", label: "Admin", adminOnly: true },
    { id: "flag", label: "Flag", featureFlag: () => false },
  ],
  ctx,
);

assert.deepEqual(
  out.map((i) => i.id),
  ["lav", "mezzi"],
);

assert.equal(pageActionMenuHasContent(out), true);
assert.equal(pageActionMenuHasContent([]), false);
assert.equal(pageActionMenuHasContent([], { onRefresh: () => {} }), true);
assert.equal(pageActionMenuHasContent([{ id: "__divider__", label: "" }]), false);

assert.equal(getSingletonPageActionListItem([{ id: "log", label: "Log" }])?.id, "log");
assert.equal(getSingletonPageActionListItem([{ id: "a", label: "A" }, { id: "b", label: "B" }]), null);
assert.equal(
  getSingletonPageActionListItem([{ id: "sub", label: "Sub", submenu: [{ id: "x", label: "X" }] }]),
  null,
);

assert.equal(isRefreshOnlyPageActionMenu([], { onRefresh: () => {} }), true);
assert.equal(isRefreshOnlyPageActionMenu([{ id: "log", label: "Log" }], { onRefresh: () => {} }), false);
assert.equal(shouldUsePageActionMenuDropdown([], { onRefresh: () => {} }), false);
assert.equal(shouldUsePageActionMenuDropdown([], { onRefresh: () => {}, backHref: "/x" }), true);

assert.equal(pageActionMenuHasAttention([{ id: "n", label: "Novità", attention: true }]), true);
assert.equal(pageActionMenuHasAttention([{ id: "n", label: "N", badge: 3 }]), true);
assert.equal(pageActionMenuHasAttention([{ id: "f", label: "Filtri", badge: "•" }]), false);
assert.equal(pageActionMenuHasAttention([{ id: "a", label: "A" }]), false);

assert.match(
  fs.readFileSync(path.join(process.cwd(), "components/ui/page-action-menu/PageActionMenu.tsx"), "utf8"),
  /pageActionMenuHasAttention/,
);

console.log("page-action-menu-permissions.test.ts OK");
