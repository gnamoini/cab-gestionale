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
  path.join(ROOT, "components/dashboard/security/security-user-page-permissions-editor.tsx"),
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
const createModalSrc = fs.readFileSync(
  path.join(ROOT, "components/dashboard/security-create-user-modal.tsx"),
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
assert.match(panelSrc, /pageDrafts/);
assert.match(panelSrc, /ToolbarGroup/);
assert.match(panelSrc, /ToolbarGroupMetaRow/);
assert.doesNotMatch(panelSrc, /GestionaleRefreshToolbarButton/);
assert.match(panelSrc, /dsPageToolbarCtaCompact/);
assert.doesNotMatch(panelSrc, /saveBtnClass/);

assert.match(drawerSrc, /SecurityUserPagePermissionsEditor/);
assert.match(drawerSrc, /Permessi pagine/);

assert.match(editorSrc, /onRestoreFromRole/);
assert.match(editorSrc, /ROLE_PAGE_READONLY/);
assert.match(editorSrc, /Eredita dal ruolo/);

assert.match(batchSrc, /user_page_overrides/);
assert.match(batchSrc, /pagePermissions/);
assert.match(batchSrc, /clearPagePermissions/);

assert.match(patchesSrc, /pagePermissions/);
assert.match(actionsSrc, /hasPagePermissionOverrides/);
assert.match(actionsSrc, /clienteRef/);
assert.match(actionsSrc, /mezzi:clienti/);
assert.match(patchesSrc, /patch\.username/);
assert.match(actionsSrc, /Modifica profilo/);
assert.match(actionsSrc, /GestionaleListTable/);
assert.match(actionsSrc, /SecurityUserMobileCard/);
assert.match(actionsSrc, /listSurface === "table"/);
assert.match(actionsSrc, /security-users-dense-table/);

assert.match(batchSrc, /username/);
assert.match(batchSrc, /check_username_available/);
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

assert.match(actionsSrc, /accountEnabled/);
assert.match(createModalSrc, /GestionaleModalShell/);
assert.match(editModalSrc, /GestionaleModalShell/);
assert.match(editModalSrc, /footer=\{/);
assert.match(editModalSrc, /GestionaleModalFooterDeleteButton/);
assert.match(editModalSrc, /GestionaleConfirmDialog/);
assert.match(editModalSrc, /useUsernameAvailability/);

assert.match(invalidateSrc, /roleOrPermissionsChanged/);
assert.match(invalidateSrc, /QK\.userPermissions/);
assert.match(invalidateSrc, /QK\.securityUsersPermissions/);

assert.match(dashboardSrc, /SecurityUsersPermissionsPanel/);
assert.match(dashboardSrc, /SecurityMonitoringSection/);
assert.match(dashboardSrc, /SecurityReleaseSection/);
assert.doesNotMatch(dashboardSrc, /UserDetailDrawer/);
assert.match(dashboardSrc, /Monitoraggio accessi/);
assert.match(dashboardSrc, /Release e pilot/);
assert.match(dashboardSrc, /filterUserItems/);

const pageAccessRlsFix = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260917120000_rbac_page_access_rls_exec_fix.sql"),
  "utf8",
);
assert.match(pageAccessRlsFix, /rbac_has_capability\(public\.rbac_auth_uid\(\), 'can_manage_security'\)/);
assert.doesNotMatch(
  pageAccessRlsFix,
  /create policy user_page_overrides_select[\s\S]*rbac_user_page_access_level/,
);

console.log("security-users-permissions-policy.test.ts OK");
