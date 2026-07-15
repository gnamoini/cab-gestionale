import type { PermissionsSnapshot } from "@/src/hooks/use-permissions";
import type { useRbac } from "@/src/hooks/use-rbac";
import type { PageActionItem } from "@/components/ui/page-action-menu/page-action-menu-types";

export type PageActionPermissionContext = {
  rbac: ReturnType<typeof useRbac>;
  perms: PermissionsSnapshot;
};

function isItemAllowed(item: PageActionItem, ctx: PageActionPermissionContext): boolean {
  if (item.hidden) return false;
  if (item.featureFlag && !item.featureFlag()) return false;
  if (item.adminOnly && !ctx.perms.global.isAdmin) return false;

  if (item.pageKey) {
    const ok = item.requireWrite
      ? ctx.rbac.canWritePage(item.pageKey)
      : ctx.rbac.canReadPage(item.pageKey);
    if (!ok) return false;
  }

  if (item.module) {
    const mod = ctx.perms.modules[item.module];
    const ok = item.requireWrite ? mod?.canWrite : mod?.canRead;
    if (!ok) return false;
  }

  return true;
}

/** Filtra item e submenu per RBAC / feature flags. Default: hide se negato. */
export function filterPageActionItems(
  items: readonly PageActionItem[],
  ctx: PageActionPermissionContext,
): PageActionItem[] {
  const out: PageActionItem[] = [];

  for (const item of items) {
    if (!isItemAllowed(item, ctx)) continue;

    const submenu =
      item.submenu && item.submenu.length > 0
        ? filterPageActionItems(item.submenu, ctx)
        : undefined;

    if (item.submenu && item.submenu.length > 0 && (!submenu || submenu.length === 0)) {
      continue;
    }

    out.push(submenu ? { ...item, submenu } : item);
  }

  return out;
}

/** Merge gruppi registrati, dedupe per id (ultimo vince). */
export function mergePageActionGroups(groups: readonly { group: string; order: number; items: PageActionItem[] }[]): PageActionItem[] {
  const sorted = [...groups].sort((a, b) => a.order - b.order || a.group.localeCompare(b.group));
  const byId = new Map<string, PageActionItem>();

  for (const g of sorted) {
    for (const item of g.items) {
      byId.set(item.id, item);
    }
  }

  return [...byId.values()];
}

if (process.env.NODE_ENV !== "production") {
  const mockCtx: PageActionPermissionContext = {
    rbac: {
      canReadPage: () => true,
      canWritePage: (k) => k !== "sicurezza",
      isAdmin: false,
    } as unknown as PageActionPermissionContext["rbac"],
    perms: {
      global: { isAdmin: false } as PermissionsSnapshot["global"],
      modules: {
        mezzi: { canRead: true, canWrite: true, isLoading: false },
      } as PermissionsSnapshot["modules"],
    },
  };
  const filtered = filterPageActionItems(
    [
      { id: "a", label: "A", pageKey: "sicurezza", requireWrite: true },
      { id: "b", label: "B", module: "mezzi", requireWrite: true },
    ],
    mockCtx,
  );
  console.assert(filtered.length === 1 && filtered[0]?.id === "b", "page-action-menu-permissions self-check");
}
