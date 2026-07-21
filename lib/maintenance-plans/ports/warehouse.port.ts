import type { EffectivePart } from "@/lib/maintenance-plans/resolve-effective-preset";

/** ponytail: stub — futuro scarico automatico magazzino */
export interface MaintenanceStockReservationPort {
  reserveParts(input: {
    executionId: string;
    parts: { ricambioId: string; quantita: number }[];
  }): Promise<{ stockTransactionIds: string[] } | null>;
}

export const maintenanceStockReservationPortStub: MaintenanceStockReservationPort = {
  async reserveParts() {
    return null;
  },
};
