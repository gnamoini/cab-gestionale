/**
 * Runtime resolver: DB SSOT — no seed merge; phantom write bloccato senza hydration.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";
import { canWritePage } from "@/src/lib/rbac/resolve-page-access";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const resolverSource = read("src/lib/runtime/truth-layer/resolve-effective-permissions.ts");
assert.doesNotMatch(
  resolverSource,
  /mergeRolePageAccessWithSeed/,
  "runtime resolver must not merge seed into role_page_access",
);

const managerSeedWrite = seedPageAccessForRole("manager").dashboard;
assert.equal(managerSeedWrite, "write", "fixture: manager seed has dashboard write");

const unhydratedEmptyDb = resolveEffectivePermissions({
  userId: "u-1",
  roleKey: "manager",
  rolePageAccess: {},
  userPageOverrideRows: [],
  pilotDbEnabled: false,
  permissionsHydrated: false,
});
assert.equal(canWritePage(unhydratedEmptyDb.resolved, "dashboard"), false);
assert.equal(isRbacSnapshotReady(unhydratedEmptyDb), false);

const phantomWithoutHydration = resolveEffectivePermissions({
  userId: "u-2",
  roleKey: "manager",
  rolePageAccess: {},
  userPageOverrideRows: [],
  pilotDbEnabled: false,
});
assert.equal(canWritePage(phantomWithoutHydration.resolved, "dashboard"), false);
assert.equal(isRbacSnapshotReady(phantomWithoutHydration), false);

const addettoDbNone = resolveEffectivePermissions({
  userId: "u-3",
  roleKey: "addetto_amministrativo",
  rolePageAccess: { dashboard: "none" },
  userPageOverrideRows: [],
  pilotDbEnabled: false,
  permissionsHydrated: true,
});
assert.equal(canWritePage(addettoDbNone.resolved, "dashboard"), false);
assert.equal(isRbacSnapshotReady(addettoDbNone), true);

const managerDbWrite = resolveEffectivePermissions({
  userId: "u-4",
  roleKey: "manager",
  rolePageAccess: { dashboard: "write" },
  userPageOverrideRows: [],
  pilotDbEnabled: false,
  permissionsHydrated: true,
});
assert.equal(canWritePage(managerDbWrite.resolved, "dashboard"), true);

console.log("resolve-effective-permissions-runtime.test.ts OK");
