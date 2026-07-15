/**
 * Guard async permessi: allineato a useRbac (cache + sticky snapshot).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import {
  clearClientEffectivePermissionsSnapshotCache,
  publishClientEffectivePermissionsSnapshot,
} from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { ensurePageWrite } from "@/src/lib/auth/permission-guards";
import { canWritePage } from "@/src/lib/rbac/resolve-page-access";
import {
  clearStickyRbacSnapshot,
  publishStickyRbacSnapshot,
} from "@/src/lib/rbac/sticky-rbac-snapshot";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

async function main(): Promise<void> {
  clearClientEffectivePermissionsSnapshotCache();
  clearStickyRbacSnapshot();

  const managerSnap = buildTestSnapshot({ userId: "mgr-1", roleKey: "manager" });
  publishStickyRbacSnapshot(managerSnap);

  const allowed = await ensurePageWrite("dashboard");
  assert.equal(allowed.success, true, "sticky snapshot deve sbloccare write dashboard");

  clearStickyRbacSnapshot();
  publishClientEffectivePermissionsSnapshot(managerSnap);

  const allowedFromCache = await ensurePageWrite("dashboard");
  assert.equal(allowedFromCache.success, true, "cache snapshot deve sbloccare write dashboard");

  const operatoreSnap = buildTestSnapshot({ userId: "op-1", roleKey: "operatore" });
  assert.equal(
    canWritePage(operatoreSnap.resolved, "dashboard"),
    false,
    "operatore seed: dashboard non scrivibile",
  );

  const guardsSource = read("src/lib/auth/permission-guards.ts");
  assert.match(guardsSource, /readStickyRbacSnapshot/);
  assert.match(guardsSource, /snap\.resolved/);

  console.log("permission-guards-sticky-parity.test: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
