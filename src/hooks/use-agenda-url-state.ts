"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import {
  type AgendaIntelligencePanel,
  type AgendaViewMode,
  buildAgendaHref,
  parseAgendaSearchParams,
} from "@/lib/navigation/agenda-links";
import { agendaUrlSnapshotKey, resolveAgendaInsightLegacyHref } from "@/lib/navigation/agenda-url-sync";
import { parseAgendaDateParam } from "@/lib/workshop-schedule/datetime";
import type { WorkshopScheduleFilters } from "@/lib/workshop-schedule/types";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";

export type AgendaUrlSyncPatch = {
  date?: string;
  event?: string | null;
  workOrder?: string | null;
  hourSlot?: number | null;
  view?: AgendaViewMode;
  panel?: AgendaIntelligencePanel | null;
};

export type UseAgendaUrlStateInput = {
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams;
  selectedYmd: string;
  viewMode: AgendaViewMode;
  selectedSessionId: string | null;
  filters: WorkshopScheduleFilters;
  analysisOpen: boolean;
  analysisPanel: AgendaIntelligencePanel;
  setSelectedYmd: (ymd: string) => void;
  setMonthKey: (key: string) => void;
  setViewMode: (mode: AgendaViewMode) => void;
  setSelectedSessionId: (id: string | null) => void;
  setFilters: Dispatch<SetStateAction<WorkshopScheduleFilters>>;
  setAnalysisCollapsed: Dispatch<SetStateAction<boolean>>;
  monthKeyFromYmd: (ymd: string) => string;
};

export function useAgendaUrlState(input: UseAgendaUrlStateInput) {
  const lastSyncedUrlRef = useRef<string | null>(null);
  const urlHydratedRef = useRef(false);
  const parsed = parseAgendaSearchParams(input.searchParams);

  const syncUrl = useCallback(
    (opts: AgendaUrlSyncPatch) => {
      const next = buildAgendaHref({
        date: opts.date ?? input.selectedYmd,
        view: opts.view ?? input.viewMode,
        event: opts.event === null ? undefined : (opts.event ?? input.selectedSessionId ?? undefined),
        workOrder: opts.workOrder === null ? undefined : (opts.workOrder ?? input.filters.workOrderId ?? undefined),
        hourSlot: opts.hourSlot === null ? undefined : (opts.hourSlot ?? parsed.hourSlot ?? undefined),
        panel:
          opts.panel === null
            ? undefined
            : (opts.panel ?? (input.analysisOpen ? input.analysisPanel : undefined)),
      });
      if (lastSyncedUrlRef.current === next) return;
      lastSyncedUrlRef.current = next;
      deferredRouterReplace(input.router, next, { scroll: false });
    },
    [
      input.router,
      input.selectedYmd,
      input.viewMode,
      input.selectedSessionId,
      input.filters.workOrderId,
      input.analysisOpen,
      input.analysisPanel,
      parsed.hourSlot,
    ],
  );

  useEffect(() => {
    const legacyHref = resolveAgendaInsightLegacyHref(input.searchParams);
    if (legacyHref) {
      lastSyncedUrlRef.current = legacyHref;
      input.setAnalysisCollapsed(false);
      input.setViewMode("day");
      deferredRouterReplace(input.router, legacyHref, { scroll: false });
      return;
    }

    const incoming = parseAgendaSearchParams(input.searchParams);
    const incomingKey = agendaUrlSnapshotKey({
      date: parseAgendaDateParam(incoming.date) ?? input.selectedYmd,
      view: incoming.legacyInsightView ? "day" : incoming.view,
      eventId: incoming.eventId,
      workOrderId: incoming.workOrderId,
      hourSlot: incoming.hourSlot,
      panel: incoming.panel,
    });

    if (lastSyncedUrlRef.current === incomingKey && urlHydratedRef.current) return;
    lastSyncedUrlRef.current = incomingKey;
    urlHydratedRef.current = true;

    const nextDate = parseAgendaDateParam(incoming.date);
    if (nextDate && nextDate !== input.selectedYmd) {
      input.setSelectedYmd(nextDate);
      input.setMonthKey(input.monthKeyFromYmd(nextDate));
    }
    const nextView = incoming.legacyInsightView ? "day" : incoming.view;
    if (nextView !== input.viewMode) input.setViewMode(nextView);
    if (incoming.eventId !== input.selectedSessionId) input.setSelectedSessionId(incoming.eventId);
    if (incoming.workOrderId) {
      input.setFilters((prev) =>
        prev.workOrderId === incoming.workOrderId ? prev : { ...prev, workOrderId: incoming.workOrderId },
      );
    }
    if (incoming.panel) input.setAnalysisCollapsed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- input decomposed to stable setter fields
  }, [
    input.searchParams,
    input.router,
    input.selectedYmd,
    input.viewMode,
    input.selectedSessionId,
    input.setAnalysisCollapsed,
    input.setFilters,
    input.setMonthKey,
    input.setSelectedSessionId,
    input.setSelectedYmd,
    input.setViewMode,
    input.monthKeyFromYmd,
  ]);

  return { syncUrl, parsed, lastSyncedUrlRef };
}
