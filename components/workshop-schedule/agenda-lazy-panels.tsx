"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

export const AgendaGanttViewLazy = dynamic(
  () => import("@/components/workshop-schedule/agenda-gantt-view").then((m) => ({ default: m.AgendaGanttView })),
);

export const AgendaDndLayerLazy = dynamic(
  () => import("@/components/workshop-schedule/agenda-dnd-layer").then((m) => ({ default: m.AgendaDndLayer })),
);

export const AgendaIntelligenceSidebarLazy = dynamic(
  () =>
    import("@/components/workshop-schedule/agenda-intelligence-sidebar").then((m) => ({
      default: m.AgendaIntelligenceSidebar,
    })),
);

export type AgendaGanttViewLazyProps = ComponentProps<typeof AgendaGanttViewLazy>;
export type AgendaDndLayerLazyProps = ComponentProps<typeof AgendaDndLayerLazy>;
export type AgendaIntelligenceSidebarLazyProps = ComponentProps<typeof AgendaIntelligenceSidebarLazy>;
