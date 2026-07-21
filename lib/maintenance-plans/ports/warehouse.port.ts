import type { EffectivePart } from "@/lib/maintenance-plans/resolve-effective-preset";

export type MaintenanceStockReservationResult = {
  stockTransactionIds: string[];
  failedRicambioIds: string[];
};

/** Scarico magazzino asincrono post-esecuzione — mai rollback manutenzione */
export interface MaintenanceStockReservationPort {
  reserveParts(input: {
    executionId: string;
    parts: { ricambioId: string; quantita: number }[];
  }): Promise<MaintenanceStockReservationResult>;
}

export const maintenanceStockReservationPortStub: MaintenanceStockReservationPort = {
  async reserveParts() {
    return { stockTransactionIds: [], failedRicambioIds: [] };
  },
};
