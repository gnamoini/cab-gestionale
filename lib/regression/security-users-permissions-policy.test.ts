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
const editModalSrc = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security/security-edit-name-modal.tsx"),
  "utf8",
);
const patchesSrc = fs.readFileSync(path.join(ROOT, "lib/security/build-security-user-patches.ts"), "utf8");
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
assert.match(panelSrc, /ToolbarGroup/);
assert.match(panelSrc, /ToolbarGroupMetaRow/);
assert.match(panelSrc, /GestionaleRefreshToolbarButton/);
assert.match(panelSrc, /dsPageToolbarCtaCompact/);
assert.doesNotMatch(panelSrc, /saveBtnClass/);

assert.match(drawerSrc, /SecurityUserModulePermissionsEditor/);
assert.match(drawerSrc, /Permessi pagine/);

assert.match(editorSrc, /onRestoreFromRole/);
assert.match(editorSrc, /ROLE_MODULE_READONLY/);

assert.match(patchesSrc, /modulePermissions/);
assert.match(actionsSrc, /hasModulePermissionOverrides/);
assert.match(actionsSrc, /clienteRef/);
assert.match(actionsSrc, /mezzi:clienti/);
assert.match(patchesSrc, /patch\.username/);
assert.match(actionsSrc, /Modifica profilo/);
assert.match(actionsSrc, /GestionaleListTable/);
assert.match(actionsSrc, /SecurityUserMobileCard/);
assert.match(actionsSrc, /lg:hidden/);
assert.match(actionsSrc, /security-users-dense-table/);

assert.match(batchSrc, /user_permissions/);
assert.match(batchSrc, /username/);
assert.match(batchSrc, /check_username_available/);
assert.match(batchSrc, /modulePermissions/);
assert.match(batchSrc, /clearModulePermissions/);
assert.match(batchSrc, /cliente_ref/);
assert.match(batchSrc, /auditClienteAssociationsAction/);
assert.match(batchSrc, /validateClienteAssociationForRole/);
assert.match(panelSrc, /validateClienteAssociationForRole/);
assert.match(panelSrc, /SecurityClienteAuditPanel/);
assert.match(panelSrc, /SecurityInlineNotice/);
assert.match(panelSrc, /securitySubsectionShellClass/);
assert.match(panelSrc, /Associazione clienti/);
assert.match(actionsSrc, /PageToolbar/);
assert.match(actionsSrc, /GestionaleSearchField/);
assert.match(actionsSrc, /SecurityInlineNotice/);
assert.match(actionsSrc, /deleteUserByAdminAction/);
assert.match(actionsSrc, /currentUserId/);
assert.match(actionsSrc, /allowAdd=\{false\}/);
assert.match(actionsSrc, /Cerca o seleziona/);

assert.match(editModalSrc, /GestionaleModalShell/);
assert.match(editModalSrc, /footer=\{/);
assert.match(editModalSrc, /dsBtnNeutral/);
assert.match(editModalSrc, /dsBtnDanger/);
assert.match(editModalSrc, /GestionaleConfirmDialog/);
assert.match(editModalSrc, /useUsernameAvailability/);

assert.match(invalidateSrc, /roleOrPermissionsChanged/);
assert.match(invalidateSrc, /QK\.userPermissions/);
assert.match(invalidateSrc, /QK\.securityUsersPermissions/);

assert.match(dashboardSrc, /SecurityUsersPermissionsPanel/);
assert.doesNotMatch(dashboardSrc, /UserDetailDrawer/);
assert.match(dashboardSrc, /Monitoraggio accessi/);
assert.match(dashboardSrc, /Release e pilot/);
assert.match(dashboardSrc, /filterUserItems/);

console.log("security-users-permissions-policy.test.ts OK");
