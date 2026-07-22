"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BULK_QUANTITY_MAX,
  BULK_QUANTITY_MIN,
  type BulkLabelCompactItem,
} from "@/lib/inventory-labels/domain/bulk-items";

export type LabelQuantities = Record<string, number>;

export type LabelSelection = {
  quantities: LabelQuantities;
  totalLabels: number;
  totalItems: number;
  hasSelection: boolean;
};

export function computeLabelSelection(quantities: LabelQuantities): LabelSelection {
  let totalLabels = 0;
  let totalItems = 0;
  for (const qty of Object.values(quantities)) {
    if (qty > 0) {
      totalLabels += qty;
      totalItems += 1;
    }
  }
  return {
    quantities,
    totalLabels,
    totalItems,
    hasSelection: totalLabels > 0,
  };
}

export function clampLabelQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const n = Math.floor(value);
  if (n <= 0) return 0;
  return Math.min(BULK_QUANTITY_MAX, n);
}

export function labelQuantitiesToCompactItems(quantities: LabelQuantities): BulkLabelCompactItem[] {
  return Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([id, quantity]) => ({ id, quantity }));
}

export function useLabelSelection() {
  const [quantities, setQuantities] = useState<LabelQuantities>({});

  const selection = useMemo(() => computeLabelSelection(quantities), [quantities]);

  const setQuantity = useCallback((id: string, rawQty: number) => {
    const qty = clampLabelQuantity(rawQty);
    setQuantities((prev) => {
      if (qty === 0) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (prev[id] === qty) return prev;
      return { ...prev, [id]: qty };
    });
  }, []);

  const clearAll = useCallback(() => {
    setQuantities({});
  }, []);

  const bumpQuantity = useCallback((id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 0;
      const nextQty = clampLabelQuantity(current + delta);
      if (nextQty === 0) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (prev[id] === nextQty) return prev;
      return { ...prev, [id]: nextQty };
    });
  }, []);

  return {
    selection,
    setQuantity,
    bumpQuantity,
    clearAll,
    setQuantities,
  };
}

export { BULK_QUANTITY_MIN, BULK_QUANTITY_MAX };
