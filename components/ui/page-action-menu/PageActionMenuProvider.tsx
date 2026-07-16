"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  PageActionItem,
  PageActionMenuBackConfig,
  PageActionMenuProviderProps,
} from "@/components/ui/page-action-menu/page-action-menu-types";
import { mergePageActionGroups } from "@/components/ui/page-action-menu/page-action-menu-permissions";

type RegisteredGroup = {
  group: string;
  order: number;
  items: PageActionItem[];
};

export type PageActionMenuContextValue = {
  items: PageActionItem[];
  registerGroup: (group: string, order: number, items: PageActionItem[]) => () => void;
  onRefresh?: () => void;
  refreshBusy: boolean;
  refreshLabel: string;
  back: PageActionMenuBackConfig | null;
  menuAttention: boolean;
};

const PageActionMenuContext = createContext<PageActionMenuContextValue | null>(null);

export function PageActionMenuProvider({
  children,
  onRefresh,
  refreshBusy = false,
  refreshLabel = "Aggiorna",
  back = null,
  menuAttention = false,
}: PageActionMenuProviderProps) {
  const [groups, setGroups] = useState<RegisteredGroup[]>([]);

  const registerGroup = useCallback((group: string, order: number, items: PageActionItem[]) => {
    setGroups((prev) => {
      const next = prev.filter((g) => g.group !== group);
      next.push({ group, order, items });
      return next;
    });
    return () => {
      setGroups((prev) => prev.filter((g) => g.group !== group));
    };
  }, []);

  const items = useMemo(() => mergePageActionGroups(groups), [groups]);

  const value = useMemo<PageActionMenuContextValue>(
    () => ({
      items,
      registerGroup,
      onRefresh,
      refreshBusy,
      refreshLabel,
      back: back ?? null,
      menuAttention,
    }),
    [items, registerGroup, onRefresh, refreshBusy, refreshLabel, back, menuAttention],
  );

  return <PageActionMenuContext.Provider value={value}>{children}</PageActionMenuContext.Provider>;
}

export function usePageActionMenuContext(): PageActionMenuContextValue | null {
  return useContext(PageActionMenuContext);
}

export function usePageActionMenuContextRequired(): PageActionMenuContextValue {
  const ctx = useContext(PageActionMenuContext);
  if (!ctx) {
    throw new Error("usePageActionMenuContextRequired must be used within PageActionMenuProvider");
  }
  return ctx;
}
