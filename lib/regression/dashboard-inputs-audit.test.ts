/**
 * Audit dashboard: security usa componenti portal (no date/select nativi nei filtri/ruolo).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const securityView = read("components/dashboard/security-dashboard-view.tsx");
const securityTable = read("components/dashboard/security/security-users-table.tsx");
const securityCreate = read("components/dashboard/security-create-user-modal.tsx");
const promemoriaForm = read("components/dashboard/promemoria/dashboard-promemoria-form-modal.tsx");
const tasksPanel = read("components/dashboard/dashboard-diary-panel.tsx");
const welcome = read("components/dashboard/dashboard-welcome.tsx");
const healthScoreWidget = read("components/dashboard/widgets/dashboard-health-score-widget.tsx");
const healthScoreRing = read("components/dashboard/dashboard-health-score-ring.tsx");

assert.doesNotMatch(welcome, /DashboardHealthScoreRing/);
assert.doesNotMatch(welcome, /useOperationalHealthScore/);
assert.match(healthScoreWidget, /DashboardHealthScoreWidget/);
assert.match(healthScoreWidget, /HealthScoreBreakdownBody/);
assert.match(healthScoreRing, /export function HealthScoreBreakdownBody/);
assert.match(healthScoreRing, /HealthScoreCalculationSummary/);
assert.match(healthScoreRing, /factor\.detail/);
assert.doesNotMatch(healthScoreRing, /score\.periodLabel/);
assert.doesNotMatch(healthScoreWidget, /score\.periodLabel/);
assert.match(welcome, /welcomeFirstName/);

const controlTowerLayout = read("components/dashboard/dashboard-control-tower-layout.tsx");
assert.match(controlTowerLayout, /resolveDashboardSectionOrder/);

const widgetRegistry = read("lib/dashboard/dashboard-widget-registry.ts");
assert.match(widgetRegistry, /health-score[\s\S]*kpi-header/);

const kpiHeaderWidget = read("components/dashboard/widgets/dashboard-operational-kpi-header-widget.tsx");
assert.match(kpiHeaderWidget, /BriefPeriodToggle/);
assert.doesNotMatch(kpiHeaderWidget, /headerActions: <BriefPeriodToggle/);
assert.doesNotMatch(kpiHeaderWidget, /headerLeadingActions: <BriefPeriodToggle/);

assert.match(securityView, /GlobalDatePickerYmd/);
assert.doesNotMatch(securityView, /type="date"/);
assert.match(securityView, /GlobalSelect/);
assert.doesNotMatch(securityView, /gestionaleSelectNativePlainClass/);

assert.match(securityTable, /GlobalSelect/);
assert.doesNotMatch(securityTable, /<select\b/);

assert.match(securityCreate, /GlobalSelect/);
assert.doesNotMatch(securityCreate, /<select\b/);

assert.match(promemoriaForm, /GlobalDatePickerYmd/);
assert.match(promemoriaForm, /htmlFor=\{titleFieldId\}/);
assert.match(promemoriaForm, /id=\{titleFieldId\}/);

assert.match(tasksPanel, /OPERATIONAL_DIARY_BODY_MAX|maxLength/);
assert.match(tasksPanel, /break-words|whitespace-pre-wrap/);
assert.match(tasksPanel, /persistQueueRef/);
assert.match(tasksPanel, /canReadPage\("dashboard"\)/);
assert.match(tasksPanel, /isPermissionDeniedError/);
assert.match(tasksPanel, /rbac\.isLoading \|\| readOnly/);
assert.match(tasksPanel, /touch-pan-y/);
assert.match(tasksPanel, /onClick=\{\(e\) => \{[\s\S]*focusField/);
assert.doesNotMatch(tasksPanel, /onPointerDown=\{[\s\S]*preventDefault/);
assert.doesNotMatch(tasksPanel, /readOnly\s*=\s*rbac\.isGuest/);

const diaryEntry = read("lib/domain/operational-diary-entry.ts");
assert.match(diaryEntry, /withPageReadGuard\("dashboard"/);
assert.match(diaryEntry, /withPageWriteGuard\("dashboard"/);

const diaryRlsFix = read("supabase/migrations/20260915122000_operational_diary_rls_exec_fix.sql");
assert.match(diaryRlsFix, /rbac_operational_diary_dashboard_read/);
assert.match(diaryRlsFix, /rbac_operational_diary_dashboard_write/);
assert.match(diaryRlsFix, /grant execute on function public\.rbac_operational_diary_dashboard_write\(\) to authenticated/);
assert.doesNotMatch(
  diaryRlsFix,
  /create policy cap_operational_diary_select[\s\S]*rbac_user_page_access_level/,
  "RLS diario: no chiamate dirette a rbac_user_page_access_level da authenticated",
);

const diaryService = read("src/services/operational-diary.service.ts");
assert.match(diaryService, /maybeSingle/);
assert.match(diaryService, /deleted_at/);

const resolverRuntime = read("src/lib/runtime/truth-layer/resolve-effective-permissions.ts");
assert.doesNotMatch(resolverRuntime, /mergeRolePageAccessWithSeed/);

const permsHook = read("src/lib/runtime/truth-layer/use-effective-permissions.ts");
assert.match(permsHook, /permissionsHydrated/);
assert.match(permsHook, /roleBundle\?\.roleKey/);

console.log("dashboard-inputs-audit.test.ts OK");
