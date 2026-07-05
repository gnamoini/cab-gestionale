"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { appendDashboardSistemaLog } from "@/lib/dashboard/dashboard-sistema-log-storage";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import type { DashboardPromemoriaRow } from "@/lib/dashboard/dashboard-promemoria-types";
import { monthKeyFromParts } from "@/lib/dashboard/dashboard-promemoria-types";
import { LoadingCardSkeleton, LoadingErrorState } from "@/components/design-system";
import { DashboardPromemoriaCalendar } from "@/components/dashboard/promemoria/dashboard-promemoria-calendar";
import { DashboardPromemoriaDayPanel } from "@/components/dashboard/promemoria/dashboard-promemoria-day-panel";
import {
  DashboardPromemoriaFormModal,
  type DashboardPromemoriaFormSubmitPayload,
} from "@/components/dashboard/promemoria/dashboard-promemoria-form-modal";
import { DashboardPromemoriaScopeDialog } from "@/components/dashboard/promemoria/dashboard-promemoria-scope-dialog";
import {
  expandRecurrenceOccurrences,
  validateRecurrenceInput,
  type PromemoriaRecurrenceScope,
} from "@/lib/dashboard/dashboard-promemoria-recurrence";
import {
  initialPromemoriaMonthKey,
  prefetchPromemoriaMonth,
  promemoriaMonthKeyFromYmd,
  shiftPromemoriaMonthKey,
  useDashboardPromemoriaDay,
} from "@/src/hooks/use-dashboard-promemoria";
import { useRbac } from "@/src/hooks/use-rbac";
import { useGestionaleConfirm } from "@/src/hooks/use-gestionale-confirm";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  dsDashboardWidgetTitle,
  dsSurfacePanelStatic,
  dsTypoCaption,
} from "@/lib/ui/design-system";

export function DashboardPromemoriaSection() {
  const { authorName } = useAuth();
  const logAutore = authorName.trim() || "Operatore";
  const queryClient = useQueryClient();
  const rbac = useRbac();
  const readOnly = !rbac.canWritePage("dashboard");
  const { confirm, confirmDialog } = useGestionaleConfirm();
  const { success: toastSuccess, error: toastError, validation: toastValidation } = useGestionaleToast();

  const [selectedYmd, setSelectedYmd] = useState(() => todayDateYmd());
  const [monthKey, setMonthKey] = useState(initialPromemoriaMonthKey);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardPromemoriaRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardPromemoriaRow | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const {
    dayRows,
    countsByDate,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useDashboardPromemoriaDay(selectedYmd, monthKey);

  if (!isLoading && !isError) {
    hasLoadedOnceRef.current = true;
  }

  const isMonthLoading = hasLoadedOnceRef.current && isFetching;
  const showInitialSkeleton = isLoading && !hasLoadedOnceRef.current;

  const errorMessage = error instanceof Error ? error.message : null;

  const handleSelectYmd = useCallback((ymd: string) => {
    const nextMonthKey = promemoriaMonthKeyFromYmd(ymd);
    setSelectedYmd(ymd);
    setMonthKey(nextMonthKey);
  }, []);

  const handleViewMonthChange = useCallback(
    (year: number, month1: number) => {
      const key = monthKeyFromParts(year, month1);
      setMonthKey(key);
      prefetchPromemoriaMonth(queryClient, shiftPromemoriaMonthKey(key, -1));
      prefetchPromemoriaMonth(queryClient, shiftPromemoriaMonthKey(key, 1));
    },
    [queryClient],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: DashboardPromemoriaRow) => {
    setEditing(row);
    setModalOpen(true);
  }, []);

  const performDelete = useCallback(
    async (row: DashboardPromemoriaRow, scope: PromemoriaRecurrenceScope) => {
      if (!rbac.canWritePage("dashboard")) {
        toastError(new Error(rbac.isLoading ? "Permessi in caricamento, riprova." : "Non hai i permessi per eseguire questa azione."));
        return;
      }
      try {
        const count = await deleteMutation.mutateAsync({ id: row.id, scope });
        const scopeLabel =
          scope === "series"
            ? "tutta la serie"
            : scope === "following"
              ? "questa e le successive"
              : "l'occorrenza";
        appendDashboardSistemaLog({
          tone: "delete",
          tipoRiga: "PROMEMORIA",
          oggettoRiga: row.title,
          modificaRiga:
            count > 1
              ? `• ${logAutore} ha eliminato ${count} promemoria (${scopeLabel})`
              : `• ${logAutore} ha eliminato il promemoria del ${row.event_date}`,
          autore: logAutore,
          atIso: new Date().toISOString(),
        });
        toastSuccess(count > 1 ? `${count} promemoria eliminati.` : "Promemoria eliminato.");
        setDeleteTarget(null);
      } catch (e) {
        toastError(e, { action: "delete" });
      }
    },
    [deleteMutation, logAutore, rbac, toastError, toastSuccess],
  );

  const handleDelete = useCallback(
    async (row: DashboardPromemoriaRow) => {
      if (row.series_id) {
        setDeleteTarget(row);
        return;
      }
      const ok = await confirm({
        title: "Elimina promemoria",
        message: `Eliminare «${row.title}»?`,
        confirmLabel: "Elimina",
        destructive: true,
      });
      if (!ok) return;
      await performDelete(row, "single");
    },
    [confirm, performDelete],
  );

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(
    async (payload: DashboardPromemoriaFormSubmitPayload) => {
      const title = payload.title.trim();
      if (!title) {
        toastValidation("Inserisci un titolo.");
        return;
      }
      if (!editing && payload.recurrence?.enabled) {
        const validation = validateRecurrenceInput(
          payload.eventDate,
          payload.recurrence.frequency ?? null,
          payload.recurrence.interval ?? 1,
          payload.recurrence.untilYmd ?? "",
          true,
        );
        if (!validation.ok) {
          toastValidation(validation.message);
          return;
        }
      }
      try {
        if (editing) {
          await updateMutation.mutateAsync({
            id: editing.id,
            eventDate: payload.eventDate,
            eventTime: payload.eventTime,
            title,
            description: payload.description,
            scope: payload.scope,
          });
          const scopeNote =
            payload.scope === "series"
              ? " (tutta la serie)"
              : payload.scope === "following"
                ? " (questa e le successive)"
                : "";
          appendDashboardSistemaLog({
            tone: "update",
            tipoRiga: "PROMEMORIA",
            oggettoRiga: title,
            modificaRiga: `• ${logAutore} ha aggiornato il promemoria del ${payload.eventDate}${scopeNote}`,
            autore: logAutore,
            atIso: new Date().toISOString(),
          });
          toastSuccess("Promemoria aggiornato.");
        } else {
          const created = await createMutation.mutateAsync({
            eventDate: payload.eventDate,
            eventTime: payload.eventTime,
            title,
            description: payload.description,
            recurrence: payload.recurrence,
          });
          const recurring = Boolean(payload.recurrence?.enabled && payload.recurrence.frequency);
          const occurrenceCount = recurring
            ? expandRecurrenceOccurrences(
                payload.eventDate,
                payload.recurrence!.frequency!,
                payload.recurrence?.interval ?? 1,
                payload.recurrence!.untilYmd!,
              ).length
            : 1;
          appendDashboardSistemaLog({
            tone: "create",
            tipoRiga: "PROMEMORIA",
            oggettoRiga: title,
            modificaRiga:
              occurrenceCount > 1
                ? `• ${logAutore} ha creato ${occurrenceCount} promemoria ricorrenti a partire dal ${payload.eventDate}`
                : `• ${logAutore} ha creato un promemoria per il ${payload.eventDate}`,
            autore: logAutore,
            atIso: new Date().toISOString(),
          });
          toastSuccess(occurrenceCount > 1 ? `${occurrenceCount} promemoria creati.` : "Promemoria creato.");
          handleSelectYmd(created.event_date);
        }
        setModalOpen(false);
        setEditing(null);
        if (editing) handleSelectYmd(payload.eventDate);
      } catch (e) {
        toastError(e instanceof Error ? e.message : "Salvataggio non riuscito.");
      }
    },
    [createMutation, editing, handleSelectYmd, logAutore, toastError, toastSuccess, toastValidation, updateMutation],
  );

  const isCurrentMonthView = monthKey === promemoriaMonthKeyFromYmd(todayDateYmd());
  const isOnTodayView = selectedYmd === todayDateYmd() && isCurrentMonthView;

  const panelBody = useMemo(() => {
    if (isError && !isLoading) {
      return (
        <LoadingErrorState
          title="Calendario non disponibile"
          description={
            errorMessage ??
            "Verifica la connessione o che la migration del database sia stata applicata (tabella dashboard_promemoria)."
          }
          onRetry={() => void refetch()}
        />
      );
    }
    if (showInitialSkeleton) {
      return <LoadingCardSkeleton minHeightClass="min-h-[280px]" rows={4} />;
    }
    return (
      <div
        data-testid="dashboard-promemoria-grid"
        className="grid min-w-0 gap-5 cab-shell-desktop:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] cab-shell-desktop:items-start"
      >
        <DashboardPromemoriaCalendar
          selectedYmd={selectedYmd}
          onSelectYmd={handleSelectYmd}
          countsByDate={countsByDate}
          viewMonthKey={monthKey}
          onViewMonthKeyChange={handleViewMonthChange}
          isMonthLoading={isMonthLoading}
          isCurrentMonthView={isCurrentMonthView}
          isOnTodayView={isOnTodayView}
          onGoToday={() => handleSelectYmd(todayDateYmd())}
          readOnly={readOnly}
          onCreatePromemoria={readOnly ? undefined : openCreate}
        />
        <DashboardPromemoriaDayPanel
          selectedYmd={selectedYmd}
          rows={dayRows}
          isLoading={isLoading || isMonthLoading}
          isError={isError}
          errorMessage={errorMessage}
          readOnly={readOnly}
          onCreate={openCreate}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>
    );
  }, [
    countsByDate,
    dayRows,
    errorMessage,
    handleDelete,
    handleSelectYmd,
    handleViewMonthChange,
    isCurrentMonthView,
    isOnTodayView,
    isError,
    isLoading,
    isMonthLoading,
    monthKey,
    refetch,
    openCreate,
    openEdit,
    readOnly,
    selectedYmd,
    showInitialSkeleton,
  ]);

  return (
    <>
    <section
      aria-label="Calendario promemoria"
      className={`${dsSurfacePanelStatic} min-w-0 max-w-full p-4 sm:p-5`}
    >
      <div className="mb-1 min-w-0 max-w-full">
        <h2 className={`${dsDashboardWidgetTitle} min-w-0`}>Calendario promemoria</h2>
      </div>
      <p className={`mb-4 max-w-2xl ${dsTypoCaption}`}>
        Riceverai una notifica in campanella il giorno dell&apos;evento (con l&apos;app aperta): alle 09:00 se non
        imposti un orario, oppure 30 minuti prima se lo indichi.
      </p>
      {panelBody}
    </section>
    {modalOpen ? (
      <DashboardPromemoriaFormModal
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        initialDate={selectedYmd}
        editing={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />
    ) : null}
    {confirmDialog}
    <DashboardPromemoriaScopeDialog
      open={deleteTarget != null}
      mode="delete"
      title={deleteTarget?.title ?? ""}
      onClose={() => setDeleteTarget(null)}
      onSelect={(scope) => {
        const row = deleteTarget;
        setDeleteTarget(null);
        if (row) void performDelete(row, scope);
      }}
    />
    </>
  );
}
