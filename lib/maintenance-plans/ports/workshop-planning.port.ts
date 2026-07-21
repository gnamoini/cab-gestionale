import type { EffectivePart } from "@/lib/maintenance-plans/resolve-effective-preset";

/** ponytail: stub — futura creazione lavorazione precompilata */
export interface MaintenanceWorkshopPlanningPort {
  createDraftLavorazione(input: {
    configId: string;
    mezzoId: string;
    presetLabel: string;
    forecastDate: string;
    partsDue: EffectivePart[];
  }): Promise<{ lavorazioneId: string } | null>;
}

export const maintenanceWorkshopPlanningPortStub: MaintenanceWorkshopPlanningPort = {
  async createDraftLavorazione() {
    return null;
  },
};
