"use client";

import Link from "next/link";
import { buildAgendaFromLavorazioneHref } from "@/lib/navigation/agenda-links";
import { localDateTimeLabel } from "@/lib/workshop-schedule/datetime";
import { PLANNING_STATUS_LABELS } from "@/lib/workshop-schedule/types";
import { erpBtnNeutral, erpBtnSoftOrange } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { useWorkshopScheduleByWorkOrder } from "@/src/hooks/use-workshop-schedule-by-work-order";

/**
 * Pannello read-only — lazy-loaded dal dettaglio lavorazione.
 * Chiama solo listByWorkOrder; nessun import da Agenda UI.
 */
export function LavorazionePlanningPanel({ lavorazioneId }: { lavorazioneId: string }) {
  const query = useWorkshopScheduleByWorkOrder(lavorazioneId);
  const sessions = query.data ?? [];

  if (query.isLoading) return <p className="text-xs text-zinc-500">Caricamento pianificazione…</p>;
  if (query.isError) {
    return <p className="text-xs text-amber-700 dark:text-amber-200">Pianificazione non disponibile.</p>;
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
      <div className="mb-2 flex items-center justify-between gap-2 min-w-0 flex-nowrap sm:flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Pianificazione</p>
        <div className="flex gap-2 min-w-0 flex-nowrap sm:flex-wrap">
          <Link href={buildAgendaFromLavorazioneHref(lavorazioneId)} className={erpBtnNeutral}>
            Apri Agenda →
          </Link>
          <Link href={buildAgendaFromLavorazioneHref(lavorazioneId)} className={erpBtnSoftOrange}>
            + Aggiungi sessione
          </Link>
        </div>
      </div>
      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-500">Nessuna sessione pianificata.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800 min-w-0 flex-nowrap sm:flex-wrap"
            >
              <span>
                {localDateTimeLabel(s.startAt)} – {localDateTimeLabel(s.endAt)}
              </span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase dark:bg-zinc-800">
                {PLANNING_STATUS_LABELS[s.planningStatus]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
