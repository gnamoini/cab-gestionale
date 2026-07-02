import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  clearStickyRbacSnapshot,
  publishStickyRbacSnapshot,
  readStickyRbacSnapshot,
} from "@/src/lib/rbac/sticky-rbac-snapshot";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";

const ROOT = process.cwd();

const onUserRoleChangedClient = fs.readFileSync(
  path.join(ROOT, "src/lib/rbac/on-user-role-changed.client.ts"),
  "utf8",
);
assert.match(onUserRoleChangedClient, /invalidateRbacTruthClient/);

const onUserRoleChangedServer = fs.readFileSync(
  path.join(ROOT, "src/lib/rbac/on-user-role-changed.server.ts"),
  "utf8",
);
assert.match(onUserRoleChangedServer, /invalidateRbacTruthServer/);

const invalidateClient = fs.readFileSync(path.join(ROOT, "src/lib/rbac/invalidate-rbac-truth.ts"), "utf8");
assert.match(invalidateClient, /clearStickyRbacSnapshot/);
assert.match(invalidateClient, /clearClientEffectivePermissionsSnapshotCache/);
assert.match(invalidateClient, /shouldClearSnapshots/);

const rolesActions = fs.readFileSync(path.join(ROOT, "src/actions/security-roles-permissions.ts"), "utf8");
const mutationCount = (rolesActions.match(/invalidateRbacTruthServer\(\)/g) ?? []).length;
assert.ok(mutationCount >= 3, "role matrix actions must call invalidateRbacTruthServer");

clearStickyRbacSnapshot();
assert.equal(readStickyRbacSnapshot(), null);

const snapA = buildTestSnapshot({ userId: "u1", roleKey: "admin" });
publishStickyRbacSnapshot(snapA);
assert.ok(isRbacSnapshotReady(readStickyRbacSnapshot()));

const snapB = buildTestSnapshot({ userId: "u1", roleKey: "operatore" });
publishStickyRbacSnapshot(snapB);
assert.equal(readStickyRbacSnapshot()?.role, "operatore", "sticky replaced by newer snapshot");

clearStickyRbacSnapshot();
assert.equal(readStickyRbacSnapshot(), null, "sticky cleared on logout path");

console.log("rbac-cache-invalidation.test.ts OK");
