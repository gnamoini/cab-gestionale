/**
 * RBAC filter per PageActionMenu items.
 */
import assert from "node:assert/strict";
import { filterPageActionItems } from "@/components/ui/page-action-menu/page-action-menu-permissions";

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

console.log("page-action-menu-permissions.test.ts OK");
