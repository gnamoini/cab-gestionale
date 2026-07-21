import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";

export function mockMaintenancePlanView(
  partial: Partial<MaintenancePlanView> & Pick<MaintenancePlanView, "id" | "nome" | "intervalOre" | "tipoIds" | "tipoLabels">,
): MaintenancePlanView {
  return {
    intervalType: "ore",
    intervalValue: partial.intervalOre,
    maintenanceKind: "tagliando_ore",
    status: "active",
    isActive: true,
    tempoPrevistoMinuti: null,
    manodoperaCostoOrario: null,
    parts: [],
    triggerGroups: [],
    checklist: [],
    currentVersionId: null,
    ...partial,
  };
}
