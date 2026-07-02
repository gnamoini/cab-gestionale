import assert from "node:assert/strict";
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import { evaluateGestionaleRouteAccess } from "@/src/lib/auth/evaluate-gestionale-route-access";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";

const input = {
  userId: "parity-1",
  roleKey: "manager",
  rolePermissionKeys: rbacSeedPermissionKeysForRole("manager"),
  permissionRows: [],
  pilotDbEnabled: false,
};

const clientSnap = resolveEffectivePermissions(input);
const serverSnap = resolveEffectivePermissions({ ...input });

assert.ok(isRbacSnapshotReady(clientSnap));
assert.ok(isRbacSnapshotReady(serverSnap));

assert.equal(clientSnap.roleKey, serverSnap.roleKey);
assert.equal(clientSnap.role, serverSnap.role);
assert.deepEqual(clientSnap.rolePermissionKeys, serverSnap.rolePermissionKeys);
assert.deepEqual(clientSnap.resolved?.allowedKeys, serverSnap.resolved?.allowedKeys);
assert.deepEqual(clientSnap.modules, serverSnap.modules);

const routeClient = evaluateGestionaleRouteAccess({
  user: { ruolo: "manager", id: input.userId },
  userId: input.userId,
  pathname: "/impostazioni",
  rolePermissionKeys: input.rolePermissionKeys,
  permissionRows: [],
  pilotDbEnabled: false,
});

const routeServer = evaluateGestionaleRouteAccess({
  user: { ruolo: "manager", id: input.userId },
  userId: input.userId,
  pathname: "/impostazioni",
  rolePermissionKeys: input.rolePermissionKeys,
  permissionRows: [],
  pilotDbEnabled: false,
});

assert.equal(routeClient, routeServer, "evaluateGestionaleRouteAccess parity");
assert.equal(routeClient, true, "manager can access impostazioni");

console.log("rbac-ssr-client-parity.test.ts OK");
