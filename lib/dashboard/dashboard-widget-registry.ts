import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { EffectiveModulePermission } from "@/src/lib/permissions/effective-permissions";

export type DashboardWidgetId =
  | "lavorazioni-kpi"
  | "magazzino-kpi"
  | "local-notes"
  | "recent-lavorazioni"
  | "recent-ricambi";

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  order: number;
  layout: "half" | "full";
  requiredModule?: GestionalePermissionModule;
  hideInStaging?: boolean;
};

// ponytail: visibility = hideInStaging | moduleAllows(read) | always-on (local-notes)
export const DASHBOARD_WIDGET_REGISTRY: readonly DashboardWidgetDefinition[] = [
  { id: "lavorazioni-kpi", order: 10, layout: "half", requiredModule: "lavorazioni" },
  { id: "magazzino-kpi", order: 20, layout: "half", requiredModule: "magazzino", hideInStaging: true },
  { id: "local-notes", order: 30, layout: "half" },
  { id: "recent-lavorazioni", order: 50, layout: "half", requiredModule: "lavorazioni", hideInStaging: true },
  { id: "recent-ricambi", order: 60, layout: "half", requiredModule: "magazzino", hideInStaging: true },
] as const;

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
  return DASHBOARD_WIDGET_REGISTRY.some((w) => w.id === id);
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
