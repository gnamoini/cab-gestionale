import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const panelSrc = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security/security-users-permissions-panel.tsx"),
  "utf8",
);
const drawerSrc = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security/security-user-detail-drawer.tsx"),
  "utf8",
);
const editorSrc = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security/security-user-module-permissions-editor.tsx"),
  "utf8",
);
const actionsSrc = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security/security-users-table.tsx"),
  "utf8",
);
const batchSrc = fs.readFileSync(path.join(ROOT, "src/actions/security-users-permissions.ts"), "utf8");
const invalidateSrc = fs.readFileSync(
  path.join(ROOT, "src/lib/runtime/truth-layer/invalidate-runtime-truth.ts"),
  "utf8",
);
const dashboardSrc = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security-dashboard-view.tsx"),
  "utf8",
);

assert.match(panelSrc, /SecurityUserDetailDrawer/);
assert.match(panelSrc, /invalidateRuntimeTruth/);
assert.match(panelSrc, /roleOrPermissionsChanged/);
assert.match(panelSrc, /buildSecurityUserPatches/);
assert.match(panelSrc, /moduleDrafts/);

assert.match(drawerSrc, /SecurityUserModulePermissionsEditor/);
assert.match(drawerSrc, /Permessi pagine/);

assert.match(editorSrc, /onRestoreFromRole/);
assert.match(editorSrc, /ROLE_MODULE_READONLY/);

assert.match(actionsSrc, /modulePermissions/);
assert.match(actionsSrc, /hasModulePermissionOverrides/);
assert.match(actionsSrc, /clienteRef/);
assert.match(actionsSrc, /mezzi:clienti/);

assert.match(batchSrc, /user_permissions/);
assert.match(batchSrc, /modulePermissions/);
assert.match(batchSrc, /clearModulePermissions/);
assert.match(batchSrc, /cliente_ref/);
assert.match(panelSrc, /validateClienteRefForRole/);
assert.match(panelSrc, /Associazione clienti/);

assert.match(invalidateSrc, /roleOrPermissionsChanged/);
assert.match(invalidateSrc, /QK\.userPermissions/);
assert.match(invalidateSrc, /QK\.securityUsersPermissions/);

assert.match(dashboardSrc, /SecurityUsersPermissionsPanel/);
assert.doesNotMatch(dashboardSrc, /UserDetailDrawer/);
assert.match(dashboardSrc, /Monitoraggio accessi/);
assert.match(dashboardSrc, /Release e pilot/);
assert.match(dashboardSrc, /filterUserItems/);

console.log("security-users-permissions-policy.test.ts OK");
