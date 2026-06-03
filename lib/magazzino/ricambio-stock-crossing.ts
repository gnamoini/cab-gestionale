export type StockSnapshot = {
  scorta: number;
  scortaMinima: number;
};

export function isStockSufficient(snapshot: StockSnapshot): boolean {
  if (snapshot.scortaMinima <= 0) return true;
  return snapshot.scorta >= snapshot.scortaMinima;
}

export function isStockBelowMin(snapshot: StockSnapshot): boolean {
  return snapshot.scortaMinima > 0 && snapshot.scorta < snapshot.scortaMinima;
}

/** Transizione da scorta sufficiente a sotto soglia minima. */
export function didCrossBelowMin(prev: StockSnapshot, curr: StockSnapshot): boolean {
  return isStockSufficient(prev) && isStockBelowMin(curr);
}

export function stockSnapshotFromRicambio(row: {
  scorta: number;
  scortaMinima: number;
}): StockSnapshot {
  return {
    scorta: Math.max(0, Math.round(row.scorta)),
    scortaMinima: Math.max(0, Math.round(row.scortaMinima)),
  };
}
