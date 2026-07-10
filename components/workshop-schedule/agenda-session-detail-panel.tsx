"use client";

import Link from "next/link";
import { Tooltip } from "@/components/ui";

import type { WorkshopScheduleSessionView } from "@/lib/workshop-schedule/types";
import { PLANNING_STATUS_LABELS } from "@/lib/workshop-schedule/types";
import {
  EVENT_TYPE_LABELS,
  PLANNING_STATUS_BADGE_CLASS,
  PRIORITY_LABELS,
} from "@/lib/workshop-schedule/agenda-ui-labels";
import { localDateTimeLabel } from "@/lib/workshop-schedule/datetime";
import { Q_FOCUS_LAV_ROW } from "@/lib/navigation/dashboard-log-links";
import { dsBtnNeutral, dsBtnPrimary, dsSectionTitle, dsSurfacePanelStatic, dsTypoCaption } from "@/lib/ui/design-system";

export function AgendaSessionDetailPanel({
  session,
  canWrite,
  onEdit,
}: {
  session: WorkshopScheduleSessionView;
  canWrite: boolean;
  onEdit: () => void;
}) {
  return (
    <div className={`${dsSurfacePanelStatic} min-h-0 gap-3 p-4`}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={dsSectionTitle}>{session.title}</p>
          {session.description ? (
            <p className={`mt-1 ${dsTypoCaption}`}>{session.description}</p>
          ) : null}
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            <span className={PLANNING_STATUS_BADGE_CLASS[session.planningStatus]}>
              {PLANNING_STATUS_LABELS[session.planningStatus]}
            </span>
            <span className="rounded-full bg-[var(--cab-surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--cab-text-muted)]">
              {EVENT_TYPE_LABELS[session.eventType]}
            </span>
            {session.priority ? (
              <span className="rounded-full bg-[var(--cab-surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--cab-text-muted)]">
                {PRIORITY_LABELS[session.priority]}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          {session.workOrderId ? (
            <Tooltip content="Apri la lavorazione collegata">
              <Link
                href={`/lavorazioni?${Q_FOCUS_LAV_ROW}=${session.workOrderId}`}
                className={dsBtnNeutral}
              >
                Apri lavorazione
              </Link>
            </Tooltip>
          ) : null}
          {canWrite && session.eventType !== "blocco_agenda" ? (
            <button type="button" className={dsBtnPrimary} onClick={onEdit}>
              Modifica
            </button>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className={dsTypoCaption}>Inizio</dt>
          <dd className="font-medium tabular-nums text-[color:var(--cab-text)]">
            {localDateTimeLabel(session.startAt)}
          </dd>
        </div>
        <div>
          <dt className={dsTypoCaption}>Fine</dt>
          <dd className="font-medium tabular-nums text-[color:var(--cab-text)]">
            {localDateTimeLabel(session.endAt)}
          </dd>
        </div>
        {session.workOrder ? (
          <>
            <div>
              <dt className={dsTypoCaption}>Lavorazione</dt>
              <dd className="font-medium text-[color:var(--cab-text)]">{session.workOrder.codice ?? "—"}</dd>
            </div>
            <div>
              <dt className={dsTypoCaption}>Cliente / mezzo</dt>
              <dd className="font-medium text-[color:var(--cab-text)]">
                {[session.workOrder.cliente, session.workOrder.targa].filter(Boolean).join(" · ") || "—"}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    </div>
  );
}
