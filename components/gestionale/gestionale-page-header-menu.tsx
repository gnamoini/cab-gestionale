"use client";

import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import type { PageActionItem } from "@/components/ui";

/** Menu ⋮ header minimo (refresh + voci opzionali) per pagine senza toolbar dedicata. */
export function GestionalePageHeaderMenu({
  items = [],
  onRefresh,
  refreshBusy = false,
}: {
  items?: PageActionItem[];
  onRefresh?: () => void;
  refreshBusy?: boolean;
}) {
  if (!onRefresh && items.length === 0) return null;
  return (
    <PageHeaderPageActionMenu
      items={items}
      onRefresh={onRefresh}
      refreshBusy={refreshBusy}
    />
  );
}
