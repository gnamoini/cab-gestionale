"use client";

import dynamic from "next/dynamic";
import { LoadingKanbanSkeleton } from "@/components/design-system/loading/loading-kanban-skeleton";
import type { ComponentProps } from "react";
import type { LavorazioniKanbanView } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-view";

const LavorazioniKanbanViewInner = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazioni-kanban-view").then((m) => m.LavorazioniKanbanView),
  { ssr: false, loading: () => <LoadingKanbanSkeleton /> },
);

export type LavorazioniKanbanViewLazyProps = ComponentProps<typeof LavorazioniKanbanView>;

/** Kanban chunk barrel — skeleton + view; loaded only when tab Kanban is selected. */
export function LavorazioniKanbanViewLazy(props: LavorazioniKanbanViewLazyProps) {
  return <LavorazioniKanbanViewInner {...props} />;
}
