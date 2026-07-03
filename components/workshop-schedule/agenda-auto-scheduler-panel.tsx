"use client";

import { Tooltip } from "@/components/design-system";
import type { AutoSchedulePlan } from "@/lib/workshop-schedule/intelligence/auto-scheduler/types";
import { localDateTimeLabel } from "@/lib/workshop-schedule/datetime";
import { AgendaListEmpty } from "@/components/workshop-schedule/agenda-session-list";
import { dsAccentSoftBanner, dsBtnNeutral, dsBtnPrimary, dsSectionTitle, dsTypoCaption } from "@/lib/ui/design-system";

export function AgendaAutoSchedulerPanel({
  plan,
  onConfirmSession,
  confirming,
}: {
  plan: AutoSchedulePlan | null;
  onConfirmSession?: (session: AutoSchedulePlan["suggestedSessions"][0]) => void;
  confirming?: boolean;
}) {
  if (!plan || plan.suggestedSessions.length === 0) {
    return (
      <AgendaListEmpty message="Nessuna proposta. Filtra per lavorazione con durata stimata disponibile." />
    );
  }

  return (
    <div className="space-y-3">
      <p className={dsSectionTitle}>
        Proposta · <span className="tabular-nums">{plan.suggestedSessions.length}</span> sessioni
      </p>
      <ol className="m-0 list-none space-y-2 p-0">
        {plan.suggestedSessions.map((s, i) => (
          <li
            key={`${s.start_at}-${i}`}
            className="flex flex-col gap-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 text-xs shadow-[var(--cab-shadow-sm)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold tabular-nums text-[color:var(--cab-text)]">
                {localDateTimeLabel(s.start_at)} → {localDateTimeLabel(s.end_at)}
              </p>
              <p className={`mt-1 ${dsTypoCaption}`}>
                Score <span className="font-semibold tabular-nums">{s.slot_score}%</span>
                <span aria-hidden> · </span>
                Confidenza <span className="font-semibold tabular-nums">{s.confidence}%</span>
              </p>
            </div>
            {onConfirmSession ? (
              <Tooltip content="Apre il form di creazione sessione con orari precompilati">
                <button
                  type="button"
                  className={dsBtnPrimary}
                  disabled={confirming}
                  onClick={() => onConfirmSession(s)}
                >
                  Conferma sessione
                </button>
              </Tooltip>
            ) : (
              <span className={dsBtnNeutral}>Solo preview</span>
            )}
          </li>
        ))}
      </ol>
      <p className={dsAccentSoftBanner + " px-3 py-2 text-[11px]"}>
        Le sessioni vengono create solo dopo conferma esplicita.
      </p>
    </div>
  );
}
