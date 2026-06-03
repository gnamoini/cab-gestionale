"use client";

import {
  reportExecutiveStripClass,
  reportHealthChipClass,
  reportHealthChipCriticalClass,
  reportHealthChipWarningClass,
} from "@/components/report/report-ui-tokens";

export type ReportExecutiveHealth = {
  disponibilitaPct: number | null;
  mezziInOfficina: number;
  totalMezzi: number;
  alertCount: number;
  criticalAlertCount: number;
};

function fmtDisp(pct: number | null): string {
  if (pct == null) return "—";
  return `${pct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

export function ReportExecutiveStrip({
  summaryLine,
  compareActive,
  health,
}: {
  summaryLine: string;
  compareActive: boolean;
  health?: ReportExecutiveHealth;
}) {
  const dispLow = health?.disponibilitaPct != null && health.disponibilitaPct < 75;
  const workshopBusy =
    health != null && health.totalMezzi > 0 && health.mezziInOfficina / health.totalMezzi > 0.25;

  return (
    <div className={reportExecutiveStripClass} role="status">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[color:var(--cab-text)]">{summaryLine}</p>
          {compareActive ? (
            <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
              Confronto periodi attivo sulle metriche supportate.
            </p>
          ) : null}
        </div>

        {health ? (
          <ul className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5" aria-label="Indicatori salute sistema">
            <li>
              <span
                className={`${reportHealthChipClass}${dispLow ? ` ${reportHealthChipWarningClass}` : ""}`}
                title="Disponibilità flotta (proxy)"
              >
                <span className="text-[color:var(--cab-text-muted)]">Disp.</span>
                <span>{fmtDisp(health.disponibilitaPct)}</span>
              </span>
            </li>
            <li>
              <span
                className={`${reportHealthChipClass}${workshopBusy ? ` ${reportHealthChipWarningClass}` : ""}`}
                title="Mezzi con lavorazione aperta"
              >
                <span className="text-[color:var(--cab-text-muted)]">Officina</span>
                <span>
                  {health.mezziInOfficina}/{health.totalMezzi}
                </span>
              </span>
            </li>
            <li>
              <span
                className={`${reportHealthChipClass}${
                  health.criticalAlertCount > 0
                    ? ` ${reportHealthChipCriticalClass}`
                    : health.alertCount > 0
                      ? ` ${reportHealthChipWarningClass}`
                      : ""
                }`}
                title="Alert attivi sui dati"
              >
                <span className="text-[color:var(--cab-text-muted)]">Alert</span>
                <span>{health.alertCount}</span>
              </span>
            </li>
          </ul>
        ) : null}
      </div>
    </div>
  );
}
