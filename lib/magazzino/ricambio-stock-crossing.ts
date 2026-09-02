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

/** Transizione a zero pezzi (anche se già sotto minimo). */
export function didCrossToZero(prev: StockSnapshot, curr: StockSnapshot): boolean {
  return prev.scorta > 0 && curr.scorta === 0;
}

/** Crossing notificabile (toast client): solo transizione sufficiente → sotto soglia. */
export function shouldNotifyStockCrossing(prev: StockSnapshot | undefined, curr: StockSnapshot): boolean {
  if (!prev) return false;
  return didCrossBelowMin(prev, curr);
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
