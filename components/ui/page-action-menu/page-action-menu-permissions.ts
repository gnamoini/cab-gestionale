import type { PermissionsSnapshot } from "@/src/hooks/use-permissions";
import type { useRbac } from "@/src/hooks/use-rbac";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
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

/** Pallino trigger: novità in menu (attention / badge), non filtri toolbar. */
function pageActionItemHasAttention(item: PageActionItem): boolean {
  if (item.attention) return true;
  if (item.badge == null) return false;
  if (item.badge === "•") return false;
  if (typeof item.badge === "number") return item.badge > 0;
  return item.badge.trim() !== "";
}

export function pageActionMenuHasAttention(items: readonly PageActionItem[]): boolean {
  for (const item of items) {
    if (item.id === "__divider__") continue;
    if (pageActionItemHasAttention(item)) return true;
    if (item.submenu?.length && pageActionMenuHasAttention(item.submenu)) return true;
  }
  return false;
}

/** Item unico nella lista (no divider, no submenu) — candidato a pulsante diretto. */
export function getSingletonPageActionListItem(
  items: readonly PageActionItem[],
): PageActionItem | null {
  const list = items.filter((item) => item.id !== "__divider__");
  if (list.length !== 1) return null;
  const only = list[0]!;
  if (only.submenu && only.submenu.length > 0) return null;
  return only;
}

/** Solo refresh in header (nessun item lista) — candidato a pulsante diretto. */
export function isRefreshOnlyPageActionMenu(
  items: readonly PageActionItem[],
  options?: { onRefresh?: () => void },
): boolean {
  const list = items.filter((item) => item.id !== "__divider__");
  return list.length === 0 && Boolean(options?.onRefresh);
}

/** Menu ⋮ vs azioni inline in header. */
export function shouldUsePageActionMenuDropdown(
  items: readonly PageActionItem[],
  options?: { onRefresh?: () => void; backHref?: string | null },
): boolean {
  if (options?.backHref) return true;
  if (isRefreshOnlyPageActionMenu(items, options)) return false;
  if (getSingletonPageActionListItem(items) !== null) return false;
  return true;
}

/** True se il menu ha almeno un'azione visibile (item, refresh header o back). */
export function pageActionMenuHasContent(
  items: readonly PageActionItem[],
  options?: { onRefresh?: () => void; backHref?: string | null },
): boolean {
  if (options?.onRefresh) return true;
  if (options?.backHref) return true;
  return items.some((item) => item.id !== "__divider__");
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
      canWritePage: (k: GestionalePageKey) => k !== "sicurezza",
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
