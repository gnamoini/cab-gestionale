"use client";

import dynamic from "next/dynamic";
import { LoadingKanbanSkeleton } from "@/components/design-system/loading/loading-kanban-skeleton";
import type { ComponentProps } from "react";
import type { LavorazioniKanbanDesktopBoard } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-desktop-board";

export const LavorazioniKanbanDesktopBoardLazy = dynamic(
  () =>
    import("@/components/gestionale/lavorazioni/lavorazioni-kanban-desktop-board").then(
      (m) => m.LavorazioniKanbanDesktopBoard,
    ),
  { loading: () => <LoadingKanbanSkeleton /> },
);

export type LavorazioniKanbanDesktopBoardLazyProps = ComponentProps<typeof LavorazioniKanbanDesktopBoard>;
