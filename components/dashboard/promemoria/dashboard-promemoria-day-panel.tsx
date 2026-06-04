"use client";

import type { ReactNode } from "react";
import { Button, IconActionButton, LoadingErrorState } from "@/components/design-system";
import { HubIconPencil, HubIconPlus, HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import type { DashboardPromemoriaRow } from "@/lib/dashboard/dashboard-promemoria-types";
import { formatRecurrenceSummary } from "@/lib/dashboard/dashboard-promemoria-recurrence";
import { formatPromemoriaEventTimeDisplay } from "@/lib/dashboard/dashboard-promemoria-reminder";
import {
  dsTableActionBtnDanger,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";

function formatDayHeading(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PromemoriaRow({
  row,
  readOnly,
  onEdit,
  onDelete,
}: {
  row: DashboardPromemoriaRow;
  readOnly: boolean;
  onEdit: (row: DashboardPromemoriaRow) => void;
  onDelete: (row: DashboardPromemoriaRow) => void;
}) {
  const timeLabel = formatPromemoriaEventTimeDisplay(row.event_time);
  const seriesSummary = row.series_id
    ? formatRecurrenceSummary(row.recurrence_frequency, row.recurrence_interval, row.recurrence_until)
    : null;
  return (
    <article className="cursor-default rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2.5 shadow-[var(--cab-shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="min-w-0 text-sm font-semibold leading-snug text-[color:var(--cab-text)]">{row.title}</h3>
            {row.series_id ? (
              <span
                className={`${dsTypoCaption} shrink-0 rounded-md border border-[color:var(--cab-border)] px-1.5 py-0.5 font-semibold text-[color:var(--cab-primary)]`}
                title={seriesSummary ?? "Serie ricorrente"}
              >
                ↻
              </span>
            ) : null}
          </div>
          {timeLabel ? (
            <p className={`mt-0.5 ${dsTypoCaption} font-medium tabular-nums text-[color:var(--cab-primary)]`}>
              {timeLabel}
            </p>
          ) : null}
          {seriesSummary ? (
            <p className={`mt-0.5 ${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>{seriesSummary}</p>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Azioni per ${row.title}`}>
            <IconActionButton
              label={`Modifica ${row.title}`}
              className={dsTableActionBtnSecondary}
              onClick={() => onEdit(row)}
            >
              <HubIconPencil className={dsTableActionGlyph} />
            </IconActionButton>
            <IconActionButton
              label={`Elimina ${row.title}`}
              className={dsTableActionBtnDanger}
              onClick={() => onDelete(row)}
            >
              <HubIconTrash className={dsTableActionGlyph} />
            </IconActionButton>
          </div>
        ) : null}
      </div>
      {row.description?.trim() ? (
        <p className={`mt-1.5 whitespace-pre-wrap ${dsTypoCaption}`}>{row.description.trim()}</p>
      ) : null}
    </article>
  );
}

function PromemoriaNewButton({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      className={`min-h-11 w-fit shrink-0 touch-manipulation self-start sm:self-auto ${className}`.trim()}
    >
      <HubIconPlus className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </Button>
  );
}

export function DashboardPromemoriaDayPanel({
  selectedYmd,
  rows,
  isLoading,
  isError,
  errorMessage,
  readOnly,
  onCreate,
  onEdit,
  onDelete,
}: {
  selectedYmd: string;
  rows: readonly DashboardPromemoriaRow[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string | null;
  readOnly: boolean;
  onCreate: () => void;
  onEdit: (row: DashboardPromemoriaRow) => void;
  onDelete: (row: DashboardPromemoriaRow) => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 cursor-default flex-col gap-3">
      <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={`${dsTypoSmall} font-bold uppercase tracking-wide text-[color:var(--cab-primary)]`}>
            Giorno selezionato
          </p>
          <p className="mt-0.5 text-sm font-medium capitalize text-[color:var(--cab-text)]">
            {formatDayHeading(selectedYmd)}
          </p>
        </div>
        {!readOnly ? (
          <PromemoriaNewButton onClick={onCreate}>Nuovo promemoria</PromemoriaNewButton>
        ) : null}
      </div>

      {isError ? (
        <LoadingErrorState
          title="Errore caricamento"
          description={errorMessage ?? "Impossibile caricare i promemoria."}
        />
      ) : isLoading ? (
        <p className={dsTypoCaption}>Caricamento…</p>
      ) : rows.length === 0 ? (
        <div
          className="flex min-w-0 flex-1 cursor-default flex-col items-center justify-center rounded-lg border border-dashed border-[color:var(--cab-border)] px-4 py-8 text-center"
          role="status"
        >
          <p className="text-sm font-medium text-[color:var(--cab-text)]">Nessun promemoria</p>
          {readOnly ? (
            <p className={`mt-1 ${dsTypoCaption}`}>Non ci sono eventi per questo giorno.</p>
          ) : null}
        </div>
      ) : (
        <ul className="gestionale-scrollbar flex max-h-[min(22rem,50vh)] min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
          {rows.map((row) => (
            <li key={row.id}>
              <PromemoriaRow row={row} readOnly={readOnly} onEdit={onEdit} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
