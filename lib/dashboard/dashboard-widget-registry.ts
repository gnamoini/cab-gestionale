import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { ResolvedPageAccess } from "@/src/lib/rbac/resolve-page-access";

export type DashboardWidgetSection =
  | "kpi-header"
  | "health-score"
  | "activity"
  | "optional";

export const DASHBOARD_SECTION_ORDER: readonly DashboardWidgetSection[] = [
  "kpi-header",
  "health-score",
  "activity",
  "optional",
] as const;

export type DashboardWidgetId =
  | "operational-kpi-header"
  | "health-score"
  | "recent-activity"
  | "local-notes"
  | "recent-lavorazioni"
  | "recent-ricambi"
  | "operational-calendar";

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  section: DashboardWidgetSection;
  order: number;
  layout: "half" | "full";
  title: string;
  subtitle?: string;
  defaultCollapsed: boolean;
  requiredModule?: GestionalePermissionModule;
  hideInStaging?: boolean;
};

// ponytail: visibility = hideInStaging | moduleAllows(read) | always-on (local-notes, kpi-header)
export const DASHBOARD_WIDGET_REGISTRY: readonly DashboardWidgetDefinition[] = [
  {
    id: "operational-kpi-header",
    section: "kpi-header",
    order: 5,
    layout: "full",
    title: "Brief operativo",
    defaultCollapsed: false,
  },
  {
    id: "health-score",
    section: "health-score",
    order: 10,
    layout: "full",
    title: "Stato operativo",
    defaultCollapsed: false,
  },
  {
    id: "recent-activity",
    section: "activity",
    order: 50,
    layout: "full",
    title: "Attività recenti",
    defaultCollapsed: true,
    hideInStaging: true,
  },
  {
    id: "local-notes",
    section: "optional",
    order: 70,
    layout: "full",
    title: "Diario operativo",
    defaultCollapsed: true,
  },
] as const;

export function getDashboardWidgetDef(id: DashboardWidgetId): DashboardWidgetDefinition | undefined {
  return DASHBOARD_WIDGET_REGISTRY.find((w) => w.id === id);
}

const LEGACY_WIDGET_IDS: readonly DashboardWidgetId[] = [
  "recent-lavorazioni",
  "recent-ricambi",
  "operational-calendar",
];

function isWidgetVisible(
  def: DashboardWidgetDefinition,
  modules: ResolvedPageAccess["modules"],
  staging: boolean,
): boolean {
  if (def.hideInStaging && staging) return false;
  if (!def.requiredModule) return true;
  return modules[def.requiredModule].canRead;
}

export function isKnownDashboardWidgetId(id: string): id is DashboardWidgetId {
  return DASHBOARD_WIDGET_REGISTRY.some((w) => w.id === id) || LEGACY_WIDGET_IDS.includes(id as DashboardWidgetId);
}

export function resolveVisibleDashboardWidgets(input: {
  modules: ResolvedPageAccess["modules"] | null | undefined;
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
