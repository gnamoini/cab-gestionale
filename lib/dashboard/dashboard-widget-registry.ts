import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";

export type DashboardWidgetSection =
  | "kpi-header"
  | "alerts"
  | "wip"
  | "magazzino"
  | "admin"
  | "activity"
  | "calendar"
  | "optional";

export const DASHBOARD_SECTION_ORDER: readonly DashboardWidgetSection[] = [
  "kpi-header",
  "alerts",
  "wip",
  "admin",
  "magazzino",
  "activity",
  "calendar",
  "optional",
] as const;

export type DashboardWidgetId =
  | "operational-kpi-header"
  | "alerts-anomalies"
  | "lavorazioni-kpi"
  | "admin-backlog"
  | "magazzino-kpi"
  | "recent-activity"
  | "operational-calendar"
  | "local-notes"
  | "recent-lavorazioni"
  | "recent-ricambi";

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  section: DashboardWidgetSection;
  order: number;
  layout: "half" | "full";
  requiredModule?: GestionalePermissionModule;
  hideInStaging?: boolean;
};

// ponytail: visibility = hideInStaging | moduleAllows(read) | always-on (local-notes, kpi-header)
export const DASHBOARD_WIDGET_REGISTRY: readonly DashboardWidgetDefinition[] = [
  { id: "operational-kpi-header", section: "kpi-header", order: 5, layout: "full" },
  { id: "alerts-anomalies", section: "alerts", order: 10, layout: "full" },
  { id: "lavorazioni-kpi", section: "wip", order: 20, layout: "full", requiredModule: "lavorazioni" },
  { id: "admin-backlog", section: "admin", order: 30, layout: "half" },
  { id: "magazzino-kpi", section: "magazzino", order: 40, layout: "half", requiredModule: "magazzino", hideInStaging: true },
  { id: "recent-activity", section: "activity", order: 50, layout: "full", hideInStaging: true },
  { id: "local-notes", section: "optional", order: 70, layout: "half" },
  { id: "operational-calendar", section: "calendar", order: 65, layout: "full" },
] as const;

const LEGACY_WIDGET_IDS: readonly DashboardWidgetId[] = [
  "recent-lavorazioni",
  "recent-ricambi",
  "operational-calendar",
];

function isWidgetVisible(
  def: DashboardWidgetDefinition,
  modules: Record<GestionalePermissionModule, EffectiveModulePermission>,
  staging: boolean,
): boolean {
  if (def.hideInStaging && staging) return false;
  if (!def.requiredModule) return true;
  return moduleAllows(modules, def.requiredModule, "read");
}

export function isKnownDashboardWidgetId(id: string): id is DashboardWidgetId {
  return DASHBOARD_WIDGET_REGISTRY.some((w) => w.id === id) || LEGACY_WIDGET_IDS.includes(id as DashboardWidgetId);
}

export function resolveVisibleDashboardWidgets(input: {
  modules: Record<GestionalePermissionModule, EffectiveModulePermission> | null | undefined;
  staging: boolean;
}): DashboardWidgetDefinition[] {
  if (!input?.modules) return [];
  return DASHBOARD_WIDGET_REGISTRY.filter((def) => isWidgetVisible(def, input.modules!, input.staging)).sort(
    (a, b) => a.order - b.order,
  );
}

export function dashboardWidgetIds(widgets: readonly DashboardWidgetDefinition[]): DashboardWidgetId[] {
  return widgets.map((w) => w.id);
}

export function groupVisibleWidgetsBySection(
  widgets: readonly DashboardWidgetDefinition[],
): Map<DashboardWidgetSection, DashboardWidgetDefinition[]> {
  const map = new Map<DashboardWidgetSection, DashboardWidgetDefinition[]>();
  for (const section of DASHBOARD_SECTION_ORDER) {
    map.set(section, []);
  }
  for (const w of widgets) {
    const list = map.get(w.section) ?? [];
    list.push(w);
    map.set(w.section, list);
  }
  return map;
}
