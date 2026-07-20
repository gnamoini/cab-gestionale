"use client";

import { useLayoutEffect } from "react";
import { usePageActionMenuContextRequired } from "@/components/ui/page-action-menu/PageActionMenuProvider";
import type {
  PageActionItem,
  UsePageActionMenuOptions,
} from "@/components/ui/page-action-menu/page-action-menu-types";

/** Registra azioni pagina nel provider. Cleanup automatico on unmount. */
export function usePageActionMenu(
  items: PageActionItem[],
  { group = "default", order = 0, deps = [] }: UsePageActionMenuOptions = {},
): void {
  const { registerGroup } = usePageActionMenuContextRequired();

  useLayoutEffect(() => {
    return registerGroup(group, order, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps controllati dal caller
  }, [registerGroup, group, order, items, ...deps]);
}
