/**
 * Test fixtures: simulate DB role_page_access from seed (NOT runtime).
 */
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";

export function buildTestSnapshot(input: {
  userId: string;
  roleKey: string;
  userPageOverrides?: { page_key: string; access_level: PageAccessLevel }[];
  /** @deprecated use userPageOverrides */
  userOverrides?: { permissionKey: string; effect: "allow" | "deny" }[];
}): EffectivePermissionsSnapshot {
  const userPageOverrideRows =
    input.userPageOverrides ??
    (input.userOverrides ?? []).flatMap((o) => {
      const [pageKey, op] = o.permissionKey.split(".");
      if (!pageKey || (op !== "read" && op !== "write")) return [];
      return [{ page_key: pageKey, access_level: (o.effect === "allow" ? op : "none") as PageAccessLevel }];
    });

  return resolveEffectivePermissions({
    userId: input.userId,
    roleKey: input.roleKey,
    rolePageAccess: seedPageAccessForRole(input.roleKey),
    userPageOverrideRows,
    pilotDbEnabled: false,
  });
}
