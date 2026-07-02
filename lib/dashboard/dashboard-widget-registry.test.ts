/**
 * Dashboard widget visibility — matrice ruolo × modulo ERP.
 */
import assert from "node:assert/strict";
import { buildModuleAccessMap } from "@/src/lib/auth/effective-module-access";
import {
  dashboardWidgetIds,
  DASHBOARD_WIDGET_REGISTRY,
  isKnownDashboardWidgetId,
  resolveVisibleDashboardWidgets,
  type DashboardWidgetId,
} from "@/lib/dashboard/dashboard-widget-registry";

const ALL_WIDGETS: DashboardWidgetId[] = [
  "lavorazioni-kpi",
  "magazzino-kpi",
  "local-notes",
  "recent-lavorazioni",
  "recent-ricambi",
];

const EXPECTED_WIDGETS: Record<string, DashboardWidgetId[]> = {
  admin: ALL_WIDGETS,
  manager: ALL_WIDGETS,
  operatore: ALL_WIDGETS,
  addetto_amministrativo: ["local-notes"],
  guest: ALL_WIDGETS,
};

function visibleIds(role: string, staging: boolean): DashboardWidgetId[] {
  const modules = buildModuleAccessMap(role, []);
  return dashboardWidgetIds(resolveVisibleDashboardWidgets({ modules, staging }));
}

function assertWidgetSnapshot(role: string, staging: boolean, expected: DashboardWidgetId[]): void {
  const actual = visibleIds(role, staging);
  assert.deepEqual(actual, expected, `${role} staging=${staging}`);
}

function main(): void {
  assert.equal(DASHBOARD_WIDGET_REGISTRY.length, 5);

  const ids = DASHBOARD_WIDGET_REGISTRY.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length, "registry must not contain duplicate widget ids");
  for (const def of DASHBOARD_WIDGET_REGISTRY) {
    assert.equal(isKnownDashboardWidgetId(def.id), true, `registry id must be known: ${def.id}`);
  }

  assertWidgetSnapshot("admin", false, EXPECTED_WIDGETS.admin);
  assertWidgetSnapshot("manager", false, EXPECTED_WIDGETS.manager);
  assertWidgetSnapshot("operatore", false, EXPECTED_WIDGETS.operatore);
  assertWidgetSnapshot("addetto_amministrativo", false, EXPECTED_WIDGETS.addetto_amministrativo);
  assertWidgetSnapshot("guest", false, EXPECTED_WIDGETS.guest);

  assertWidgetSnapshot("operatore", true, ["lavorazioni-kpi", "local-notes"]);

  assert.deepEqual(resolveVisibleDashboardWidgets({ modules: null, staging: false }), []);
  assert.deepEqual(resolveVisibleDashboardWidgets({ modules: undefined, staging: false }), []);

  console.log("dashboard-widget-registry.test: OK");
}

main();
