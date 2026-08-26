"use client";

import { useCallback, useMemo, useState } from "react";

export type MezziQrSelection = {
  selectedIds: Set<string>;
  hasSelection: boolean;
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
};

export function useMezziQrSelection(): MezziQrSelection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return useMemo(
    () => ({
      selectedIds,
      hasSelection: selectedIds.size > 0,
      count: selectedIds.size,
      isSelected,
      toggle,
      selectAll,
      clear,
    }),
    [selectedIds, isSelected, toggle, selectAll, clear],
  );
}
