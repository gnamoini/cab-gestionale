import { GESTIONALE_PAGES, type PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import { pageAccessFromLevel } from "@/src/lib/permissions/gestionale-pages";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";

export type PageOverrideUiLevel = PageAccessLevel | "inherit";

export type PagePermissionDraftRow = {
  pageKey: string;
  label: string;
  roleLevel: PageAccessLevel;
  overrideLevel: PageOverrideUiLevel;
  effectiveLevel: PageAccessLevel;
  canRead: boolean;
  canWrite: boolean;
  isCustomized: boolean;
};

export function computePagePermissionDraft(
  roleKey: string,
  rolePageAccess: Record<string, PageAccessLevel>,
  userId: string,
  userOverrides: { user_id: string; page_key: string; access_level: PageAccessLevel }[],
): PagePermissionDraftRow[] {
  const roleDefaults = Object.keys(rolePageAccess).length > 0 ? rolePageAccess : seedPageAccessForRole(roleKey);
  const overrideByPage = new Map(
    userOverrides.filter((r) => r.user_id === userId).map((r) => [r.page_key, r.access_level]),
  );

  return GESTIONALE_PAGES.map((page) => {
    const roleLevel = roleDefaults[page.key] ?? "none";
    const hasOverride = overrideByPage.has(page.key);
    const overrideLevel: PageOverrideUiLevel = hasOverride ? overrideByPage.get(page.key)! : "inherit";
    const effectiveLevel = overrideLevel === "inherit" ? roleLevel : overrideLevel;
    const access = pageAccessFromLevel(effectiveLevel);
    return {
      pageKey: page.key,
      label: page.label,
      roleLevel,
      overrideLevel,
      effectiveLevel,
      canRead: access.canRead,
      canWrite: access.canWrite,
      isCustomized: hasOverride,
    };
  });
}

export function snapshotPageDraft(rows: PagePermissionDraftRow[]): string {
  return JSON.stringify(rows.map((r) => ({ k: r.pageKey, o: r.overrideLevel })));
}

export function hasPagePermissionOverrides(
  userId: string,
  userOverrides: { user_id: string; page_key: string }[],
): boolean {
  return userOverrides.some((r) => r.user_id === userId);
}

export function planPagePermissionPersist(
  draft: PagePermissionDraftRow[],
): { upserts: { pageKey: string; level: PageAccessLevel }[]; deletes: string[] } {
  const upserts: { pageKey: string; level: PageAccessLevel }[] = [];
  const deletes: string[] = [];
  for (const row of draft) {
    if (row.overrideLevel === "inherit") {
      if (row.isCustomized) deletes.push(row.pageKey);
      continue;
    }
    upserts.push({ pageKey: row.pageKey, level: row.overrideLevel });
  }
  return { upserts, deletes };
}

/** Payload per batch save — solo override espliciti (non "inherit"). */
export function pagePermissionsPayloadFromDraft(
  draft: PagePermissionDraftRow[],
): { pageKey: string; accessLevel: PageAccessLevel }[] {
  return draft
    .filter((row) => row.overrideLevel !== "inherit")
    .map((row) => ({ pageKey: row.pageKey, accessLevel: row.overrideLevel as PageAccessLevel }));
}

export function buildInitialPageDraft(
  roleKey: string,
  rolePageAccess: Record<string, PageAccessLevel>,
  userId: string,
  userOverrides: { user_id: string; page_key: string; access_level: PageAccessLevel }[],
): PagePermissionDraftRow[] {
  return computePagePermissionDraft(roleKey, rolePageAccess, userId, userOverrides);
}
