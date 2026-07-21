/** Merge gate stock — solo stock_version + operation_id. Mai updated_at. */

export type StockMergeSource = "mutation" | "realtime" | "refetch" | "optimistic" | "rejected";

export type StockMergeEntity = {
  ricambioId: string;
  quantita: number;
  stockVersion: number;
  lastOperationId: string | null;
};

export type StockMergeDecision = "ignore" | "merge" | "warn_conflict";

export type StockMergeResult = {
  decision: StockMergeDecision;
  merged: StockMergeEntity | null;
};

function normOp(id: string | null | undefined): string | null {
  const t = id?.trim();
  return t || null;
}

/** Decide se applicare incoming sulla cache. */
export function evaluateStockMerge(
  incoming: StockMergeEntity,
  cached: StockMergeEntity | null | undefined,
): StockMergeResult {
  if (!cached) {
    return { decision: "merge", merged: incoming };
  }

  if (incoming.stockVersion < cached.stockVersion) {
    return { decision: "ignore", merged: null };
  }

  if (incoming.stockVersion === cached.stockVersion) {
    const inOp = normOp(incoming.lastOperationId);
    const cacheOp = normOp(cached.lastOperationId);
    if (inOp && cacheOp && inOp === cacheOp) {
      return { decision: "ignore", merged: null };
    }
    if (inOp !== cacheOp) {
      return { decision: "warn_conflict", merged: null };
    }
    return { decision: "ignore", merged: null };
  }

  return { decision: "merge", merged: incoming };
}
