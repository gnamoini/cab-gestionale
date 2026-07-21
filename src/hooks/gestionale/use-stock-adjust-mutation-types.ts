import type { StockAdjustRequest } from "@/lib/magazzino/stock-adjust-client";
import type { StockEntity } from "@/lib/magazzino/stock-entity-cache";

export type StockAdjustMutationInput = Omit<StockAdjustRequest, "expectedVersion" | "operationId"> & {
  operationId?: string;
  /** @deprecated v4: display via pending journal, non altera certified. */
  optimisticQuantita?: number;
};

export type StockAdjustMutationContext = {
  previous: StockEntity | null;
  operationId: string;
};

export type StockAdjustMutationOutcome =
  | { ok: true; data: import("@/lib/magazzino/stock-adjust-client").StockAdjustResponse & { operationId: string } }
  | { ok: false; error: string };
