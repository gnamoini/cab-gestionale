"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarV2Grid } from "@/components/dashboard/calendar-v2/calendar-v2-grid";
import type { CalendarSelection } from "@/components/dashboard/calendar-v2/calendar-v2-types";
import { PageHeader } from "@/components/gestionale/page-header";
import { LoadingAgendaContentSkeleton, Tooltip } from "@/components/design-system";
import { AgendaFiltersBar } from "@/components/workshop-schedule/agenda-filters-bar";
import { AgendaDayTimeline } from "@/components/workshop-schedule/agenda-day-timeline";
import { AgendaSessionFormModal, type AgendaSessionFormValues } from "@/components/workshop-schedule/agenda-session-form-modal";
import { AgendaSessionGroupedList, AgendaWeekDayColumn } from "@/components/workshop-schedule/agenda-session-list";
import { AgendaDndLayer } from "@/components/workshop-schedule/agenda-dnd-layer";
import { AgendaViewTabs } from "@/components/workshop-schedule/agenda-view-tabs";
import { AgendaGanttView } from "@/components/workshop-schedule/agenda-gantt-view";
import { AgendaIntelligenceSidebar } from "@/components/workshop-schedule/agenda-intelligence-sidebar";
import { AgendaInsightsPanel } from "@/components/workshop-schedule/agenda-insights-panel";
import { AgendaToolbarShell } from "@/components/workshop-schedule/agenda-toolbar-shell";
import { AgendaCapacityCard } from "@/components/workshop-schedule/agenda-capacity-card";
import { AgendaSessionDetailPanel } from "@/components/workshop-schedule/agenda-session-detail-panel";
import type { AgendaViewMode } from "@/lib/navigation/agenda-links";
import { buildAgendaHref, parseAgendaSearchParams } from "@/lib/navigation/agenda-links";
import { weekStartYmdFromYmd } from "@/lib/report/calendar-report-service";
import { useWorkshopScheduleIntelligence } from "@/lib/workshop-schedule/intelligence/use-workshop-intelligence";
import { buildDayBoundsIso, localTimeLabel, parseAgendaDateParam, ymdFromIso } from "@/lib/workshop-schedule/datetime";
import type { WorkshopScheduleFilters, WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import { defaultScheduleSuggestionEngine } from "@/lib/workshop-schedule/slot-suggestion/default-engine";
import { useWorkshopScheduleRange, useWorkshopScheduleDayCapacity } from "@/src/hooks/use-workshop-schedule";
import { useWorkshopScheduleMutations } from "@/src/hooks/use-workshop-schedule-mutations";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { canWrite } from "@/lib/auth/rbac";
import {
  dsAccentSoftBanner,
  dsBtnNeutral,
  dsBtnPrimary,
  dsSectionTitle,
  dsStackPage,
  dsSurfacePanelStatic,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKeyFromYmd(ymd: string) {
  return ymd.slice(0, 7);
}

export function AgendaOfficinaView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsed = parseAgendaSearchParams(searchParams);
  const { snapshot } = useEffectivePermissions();
  const canWriteAgenda =
    Boolean(snapshot?.rbacContext?.resolved) &&
    canWrite(
      { ruolo: snapshot?.role },
      "dashboard",
      snapshot!.rbacContext as import("@/lib/rbac").RequiredRbacContext,
    );

  const [selectedYmd, setSelectedYmd] = useState(() => parseAgendaDateParam(parsed.date) ?? todayYmd());
  const [monthKey, setMonthKey] = useState(() => monthKeyFromYmd(parseAgendaDateParam(parsed.date) ?? todayYmd()));
  const [viewMode, setViewMode] = useState<AgendaViewMode>(parsed.view);
  const [filters, setFilters] = useState<WorkshopScheduleFilters>(() =>
    parsed.workOrderId ? { workOrderId: parsed.workOrderId } : {},
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSeed, setFormSeed] = useState<{ startAt: string; endAt: string } | null>(null);

  const rangeStart = useMemo(() => {
    if (viewMode === "month") {
      const [y, m] = monthKey.split("-").map(Number);
      return new Date(y, m - 1, 1).toISOString();
    }
    const bounds = buildDayBoundsIso(selectedYmd, 0, 24);
    return bounds.start;
  }, [viewMode, monthKey, selectedYmd]);

  const rangeEnd = useMemo(() => {
    if (viewMode === "month") {
      const [y, m] = monthKey.split("-").map(Number);
      return new Date(y, m, 0, 23, 59, 59).toISOString();
    }
    const bounds = buildDayBoundsIso(selectedYmd, 0, 24);
    return bounds.end;
  }, [viewMode, monthKey, selectedYmd]);

  const { sessions, isLoading, isError, error } = useWorkshopScheduleRange(rangeStart, rangeEnd, filters);
  const dayCapacity = useWorkshopScheduleDayCapacity(selectedYmd, rangeStart, rangeEnd);
  const { upsertMutation, patchTimesMutation, deleteMutation } = useWorkshopScheduleMutations();

  const rangeStartYmd = useMemo(() => ymdFromIso(rangeStart), [rangeStart]);
  const rangeEndYmd = useMemo(() => ymdFromIso(rangeEnd), [rangeEnd]);
  const weekStartYmd = useMemo(() => weekStartYmdFromYmd(selectedYmd) ?? selectedYmd, [selectedYmd]);

  const heatmapDates = useMemo(() => {
    const start = weekStartYmdFromYmd(selectedYmd) ?? selectedYmd;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${start}T12:00:00`);
      d.setDate(d.getDate() + i);
      return ymdFromIso(d.toISOString());
    });
  }, [selectedYmd]);

  const invalidationKey = useMemo(
    () => sessions.map((s) => `${s.id}:${s.updatedAt}`).join("|"),
    [sessions],
  );

  const intelligence = useWorkshopScheduleIntelligence({
    sessions,
    rangeStartYmd,
    rangeEndYmd,
    weekStartYmd,
    heatmapDates,
    invalidationKey,
  });

  const autoSchedulePlan = useMemo(() => {
    const woId = filters.workOrderId ?? parsed.workOrderId;
    if (!woId) return null;
    return intelligence.planAutoScheduleFor({
      workOrderId: woId,
      estimatedDurationMinutes: 120,
      priority: "media",
      searchDaysYmd: heatmapDates,
    });
  }, [filters.workOrderId, parsed.workOrderId, intelligence, heatmapDates]);

  const countsByDate = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of sessions) {
      const ymd = ymdFromIso(s.startAt);
      out[ymd] = (out[ymd] ?? 0) + 1;
    }
    return out;
  }, [sessions]);

  const selection: CalendarSelection = { mode: "day", ymd: selectedYmd };

  const syncUrl = useCallback(
    (opts: {
      date?: string;
      event?: string | null;
      workOrder?: string | null;
      hourSlot?: number | null;
      view?: AgendaViewMode;
    }) => {
      deferredRouterReplace(
        router,
        buildAgendaHref({
          date: opts.date ?? selectedYmd,
          view: opts.view ?? viewMode,
          event: opts.event ?? undefined,
          workOrder: opts.workOrder ?? filters.workOrderId ?? undefined,
          hourSlot: opts.hourSlot ?? parsed.hourSlot ?? undefined,
        }),
        { scroll: false },
      );
    },
    [router, selectedYmd, viewMode, filters.workOrderId, parsed.hourSlot],
  );

  const selectedSession = useMemo(() => {
    const id = selectedSessionId ?? parsed.eventId ?? null;
    if (!id || !sessions.length) return null;
    return sessions.find((s) => s.id === id) ?? null;
  }, [selectedSessionId, parsed.eventId, sessions]);

  const weekSessions = useMemo(() => {
    if (viewMode !== "week") return [];
    const start = new Date(`${selectedYmd}T12:00:00`);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(start);
    monday.setDate(start.getDate() + mondayOffset);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return days.map((ymd) => ({
      ymd,
      items: sessions.filter((s) => ymdFromIso(s.startAt) === ymd),
    }));
  }, [viewMode, selectedYmd, sessions]);

  const suggestions = useMemo(
    () =>
      defaultScheduleSuggestionEngine.suggest({
        durationMinutes: 60,
        dayYmd: selectedYmd,
        existingSessions: sessions,
        dayCapacity,
      }),
    [selectedYmd, sessions, dayCapacity],
  );

  async function handleSubmit(values: AgendaSessionFormValues) {
    await upsertMutation.mutateAsync({
      id: values.id,
      title: values.title.trim() || "Sessione",
      description: values.description.trim() || null,
      eventType: values.eventType,
      blockType: values.blockType || null,
      startAt: values.startAt,
      endAt: values.endAt,
      planningStatus: values.eventType === "blocco_agenda" ? "confirmed" : values.planningStatus,
      priority: values.priority || null,
      workOrderId: values.eventType === "blocco_agenda" ? null : values.workOrderId || null,
    });
    setFormOpen(false);
    setFormSeed(null);
  }

  return (
    <>
      <PageHeader title="Agenda" description="Pianificazione sessioni di lavoro" />
      <div className={dsStackPage}>
        <AgendaToolbarShell>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <AgendaFiltersBar filters={filters} onChange={setFilters} canWrite={canWriteAgenda} />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <AgendaViewTabs
                viewMode={viewMode}
                onViewModeChange={(v) => {
                  setViewMode(v);
                  syncUrl({ view: v });
                }}
              />
              {canWriteAgenda ? (
                <Tooltip content="Crea una nuova sessione o blocco agenda">
                  <button
                    type="button"
                    className={dsBtnPrimary}
                    onClick={() => {
                      setSelectedSessionId(null);
                      setFormSeed(null);
                      setFormOpen(true);
                    }}
                  >
                    Nuova sessione
                  </button>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </AgendaToolbarShell>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,300px)]">
          <CalendarV2Grid
            monthKey={monthKey}
            onMonthKeyChange={setMonthKey}
            selection={selection}
            onSelectDay={(ymd) => {
              setSelectedYmd(ymd);
              syncUrl({ date: ymd });
            }}
            onSelectWeek={() => setViewMode("week")}
            viewMode="month"
            onViewModeChange={() => setViewMode("month")}
            hasDataByDate={Object.fromEntries(Object.entries(countsByDate).map(([k, v]) => [k, v > 0]))}
            isLoading={isLoading}
            onGoToday={() => {
              const t = todayYmd();
              setSelectedYmd(t);
              setMonthKey(monthKeyFromYmd(t));
              syncUrl({ date: t });
            }}
          />

          <div className="flex min-w-0 flex-col gap-3">
            <AgendaCapacityCard capacity={dayCapacity} />

            {isError ? (
              <p className="text-sm text-red-600">{error?.message ?? "Errore caricamento agenda."}</p>
            ) : isLoading ? (
              <LoadingAgendaContentSkeleton />
            ) : viewMode === "gantt" ? (
              <AgendaGanttView
                rows={intelligence.gantt.rows}
                axis={intelligence.gantt.axis}
                selectedSessionId={selectedSession?.id}
                onSelectSession={(id) => {
                  setSelectedSessionId(id);
                  syncUrl({ event: id });
                }}
              />
            ) : viewMode === "insight" ? (
              <div className={`${dsSurfacePanelStatic} min-h-0 gap-3 p-4`}>
                <p className={dsSectionTitle}>Planner Insights</p>
                <p className={dsTypoCaption}>Analisi read-only sulla pianificazione corrente</p>
                <AgendaInsightsPanel insights={intelligence.insights} />
              </div>
            ) : viewMode === "week" ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {weekSessions.map((col) => (
                  <AgendaWeekDayColumn
                    key={col.ymd}
                    ymd={col.ymd}
                    sessions={col.items}
                    selectedId={selectedSession?.id}
                    isToday={col.ymd === todayYmd()}
                    onSelect={(s) => {
                      setSelectedSessionId(s.id);
                      syncUrl({ event: s.id });
                    }}
                  />
                ))}
              </div>
            ) : viewMode === "month" ? (
              <div className={`${dsSurfacePanelStatic} min-h-0 gap-3 p-3`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={dsSectionTitle}>Sessioni del mese</p>
                  <span className={dsTypoCaption}>
                    {sessions.filter((s) => ymdFromIso(s.startAt).startsWith(monthKey)).length} totali
                  </span>
                </div>
                <AgendaSessionGroupedList
                  sessions={sessions.filter((s) => ymdFromIso(s.startAt).startsWith(monthKey))}
                  selectedId={selectedSession?.id}
                  emptyMessage="Nessuna sessione nel mese selezionato."
                  onSelect={(s) => {
                    setSelectedSessionId(s.id);
                    syncUrl({ event: s.id });
                  }}
                />
              </div>
            ) : (
              <>
                <AgendaDayTimeline
                  dayYmd={selectedYmd}
                  sessions={sessions}
                  selectedId={selectedSession?.id}
                  onSelect={(s) => {
                    setSelectedSessionId(s.id);
                    syncUrl({ event: s.id });
                  }}
                  onSlotClick={(startAt, endAt) => {
                    if (!canWriteAgenda) return;
                    setFormSeed({ startAt, endAt });
                    setSelectedSessionId(null);
                    setFormOpen(true);
                  }}
                />
                {canWriteAgenda ? (
                  <AgendaDndLayer
                    dayYmd={selectedYmd}
                    sessions={sessions.filter((s) => ymdFromIso(s.startAt) === selectedYmd)}
                    selectedId={selectedSession?.id}
                    onSelect={(s) => {
                      setSelectedSessionId(s.id);
                      syncUrl({ event: s.id });
                    }}
                    onReschedule={(id, startAt, endAt) => {
                      void patchTimesMutation.mutateAsync({ id, startAt, endAt });
                    }}
                  />
                ) : null}
              </>
            )}

            {selectedSession ? (
              <AgendaSessionDetailPanel
                session={selectedSession}
                canWrite={canWriteAgenda}
                onEdit={() => setFormOpen(true)}
              />
            ) : null}

            {canWriteAgenda && suggestions.length > 0 ? (
              <div className={`${dsAccentSoftBanner} space-y-2 rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] p-3`}>
                <div>
                  <p className={dsSectionTitle}>Slot consigliati</p>
                  <p className={`mt-0.5 ${dsTypoCaption}`}>
                    Suggerimenti automatici — clic per precompilare il form (60 min)
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {suggestions.slice(0, 4).map((slot) => (
                    <Tooltip
                      key={slot.startAt}
                      content={`Score ${slot.slotScore}% · ${localTimeLabel(slot.startAt)}–${localTimeLabel(slot.endAt)}`}
                    >
                      <button
                        type="button"
                        className={dsBtnNeutral}
                        onClick={() => {
                          setFormSeed({ startAt: slot.startAt, endAt: slot.endAt });
                          setFormOpen(true);
                        }}
                      >
                        {slot.slotScore}% · {localTimeLabel(slot.startAt)}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <AgendaIntelligenceSidebar
            heatmapCells={intelligence.heatmap}
            weeklyLoad={intelligence.weeklyLoad}
            autoSchedulePlan={autoSchedulePlan}
            insights={intelligence.insights}
            selectedDate={selectedYmd}
            selectedHourSlot={parsed.hourSlot}
            defaultPanel={
              parsed.panel === "heatmap"
                ? "heatmap"
                : parsed.panel === "weeklyLoad"
                  ? "weeklyLoad"
                  : parsed.panel === "autoScheduler"
                    ? "autoScheduler"
                    : "insights"
            }
            onHeatmapCellClick={(cell) => {
              setSelectedYmd(cell.date);
              setViewMode("day");
              syncUrl({ date: cell.date, view: "day", hourSlot: cell.hourSlot });
            }}
            onConfirmAutoSession={
              canWriteAgenda
                ? (session) => {
                    setFormSeed({ startAt: session.start_at, endAt: session.end_at });
                    setSelectedSessionId(null);
                    setFormOpen(true);
                  }
                : undefined
            }
            autoConfirming={upsertMutation.isPending}
          />
        </div>
      </div>

      {formOpen ? (
        <AgendaSessionFormModal
          open={formOpen}
        initial={
          selectedSession ??
          (formSeed
            ? ({
                id: "",
                title: "",
                description: null,
                eventType: "intervento_programmato",
                blockType: null,
                startAt: formSeed.startAt,
                endAt: formSeed.endAt,
                planningStatus: "scheduled",
                priority: "media",
                workOrderId: parsed.workOrderId,
                revision: 1,
                createdBy: "",
                createdAt: "",
                updatedAt: "",
                deletedAt: null,
                seriesId: null,
                recurrenceFrequency: null,
                recurrenceInterval: null,
                recurrenceUntil: null,
                legacyPromemoriaId: null,
                workOrder: null,
              } satisfies WorkshopScheduleSessionView)
            : null)
        }
        workOrderIdPrefill={parsed.workOrderId}
        canWrite={canWriteAgenda}
        saving={upsertMutation.isPending || deleteMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setFormSeed(null);
        }}
        onSubmit={handleSubmit}
        onDelete={
          selectedSession
            ? async (id) => {
                await deleteMutation.mutateAsync(id);
                setSelectedSessionId(null);
                setFormOpen(false);
                syncUrl({ event: null });
              }
            : undefined
        }
        />
      ) : null}
    </>
  );
}
