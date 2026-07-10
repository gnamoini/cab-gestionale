"use client";

import type { WeeklyLoadSnapshot } from "@/lib/workshop-schedule/intelligence/weekly-load/types";
import { Tooltip } from "@/components/ui";
import { dsBadgeWarn, dsSectionTitle, dsTypoCaption } from "@/lib/ui/design-system";

function barColor(pct: number): string {
  if (pct >= 90) return "bg-[color:var(--cab-danger)]";
  if (pct >= 70) return "bg-[color:var(--cab-warning)]";
  return "bg-[color:var(--cab-success)]";
}

export function AgendaWeeklyLoadWidget({ snapshot }: { snapshot: WeeklyLoadSnapshot }) {
  return (
    <div className="space-y-3 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
      <div>
        <p className={dsSectionTitle}>Carico settimanale</p>
        <p className={`mt-0.5 ${dsTypoCaption}`}>
          {snapshot.weekRange} · <span className="tabular-nums font-semibold">{snapshot.totalPlannedHours}h</span>{" "}
          pianificate
        </p>
      </div>

      <div className="flex items-end gap-1.5">
        {snapshot.dailyBreakdown.map((d) => (
          <Tooltip key={d.date} content={`${d.date}: carico ${d.loadPct}%`}>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end rounded-md bg-[var(--cab-surface-2)] p-0.5">
                <div
                  className={`w-full rounded-sm transition-all ${barColor(d.loadPct)}`}
                  style={{ height: `${Math.min(100, Math.max(4, d.loadPct))}%` }}
                />
              </div>
              <span className={`truncate tabular-nums ${dsTypoCaption}`}>{d.date.slice(8)}</span>
            </div>
          </Tooltip>
        ))}
      </div>

      {snapshot.bottlenecks.length > 0 ? (
        <ul className="m-0 list-none space-y-1.5 p-0" aria-label="Colli di bottiglia">
          {snapshot.bottlenecks.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-2.5 py-2 text-xs text-[color:var(--cab-text)]"
            >
              <span className={dsBadgeWarn}>Bottleneck</span>
              <span className="min-w-0 flex-1 leading-snug">{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={dsTypoCaption}>Nessun collo di bottiglia rilevato questa settimana.</p>
      )}

      <p className={dsTypoCaption}>Simulazione read-only — non modifica la pianificazione.</p>
    </div>
  );
}
