"use client";

import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import type { PageActionItem } from "@/components/ui";

/** Menu ⋮ header minimo per pagine senza toolbar dedicata. */
export function GestionalePageHeaderMenu({ items = [] }: { items?: PageActionItem[] }) {
  if (items.length === 0) return null;
  return <PageHeaderPageActionMenu items={items} />;
}
