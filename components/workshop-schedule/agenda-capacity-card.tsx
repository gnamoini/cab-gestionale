"use client";


import type { DayCapacitySnapshot } from "@/lib/workshop-schedule/day-capacity";
import { Tooltip } from "@/components/ui";
import { dsBadgeDanger, dsBadgeOk, dsBadgeWarn, dsSectionTitle, dsTypoCaption } from "@/lib/ui/design-system";

function saturationBadge(pct: number): string {
  if (pct >= 90) return dsBadgeDanger;
  if (pct >= 70) return dsBadgeWarn;
  return dsBadgeOk;
}

export function AgendaCapacityCard({ capacity }: { capacity: DayCapacitySnapshot }) {
  const barPct = Math.min(100, Math.max(0, capacity.saturationPct));

  return (
    <div className="rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 shadow-[var(--cab-shadow-sm)]">
      <div className="flex min-w-0 items-start justify-between gap-2 flex-nowrap sm:flex-wrap">
        <div>
          <p className={dsSectionTitle}>Capacità giornaliera</p>
          <p className={`mt-0.5 ${dsTypoCaption}`}>
            Finestra operativa {capacity.dayBoundsMinutes} min
          </p>
        </div>
        <Tooltip content="Percentuale del tempo disponibile già occupata da sessioni pianificate (esclusi blocchi)">
          <span className={saturationBadge(capacity.saturationPct)}>{capacity.saturationPct}%</span>
        </Tooltip>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cab-surface-2)]"
        role="progressbar"
        aria-valuenow={barPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Saturazione agenda"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            barPct >= 90 ? "bg-[color:var(--cab-danger)]" : barPct >= 70 ? "bg-[color:var(--cab-warning)]" : "bg-[color:var(--cab-success)]"
          }`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className={dsTypoCaption}>Pianificato</dt>
          <dd className="font-semibold tabular-nums text-[color:var(--cab-text)]">{capacity.plannedMinutes} min</dd>
        </div>
        <div>
          <dt className={dsTypoCaption}>Blocchi</dt>
          <dd className="font-semibold tabular-nums text-[color:var(--cab-text)]">{capacity.blockedMinutes} min</dd>
        </div>
        <div>
          <dt className={dsTypoCaption}>Disponibile</dt>
          <dd className="font-semibold tabular-nums text-[color:var(--cab-text)]">{capacity.availableMinutes} min</dd>
        </div>
        <div>
          <dt className={dsTypoCaption}>Libero</dt>
          <dd className="font-semibold tabular-nums text-[color:var(--cab-text)]">
            {Math.max(0, capacity.availableMinutes - capacity.plannedMinutes)} min
          </dd>
        </div>
      </dl>
    </div>
  );
}
