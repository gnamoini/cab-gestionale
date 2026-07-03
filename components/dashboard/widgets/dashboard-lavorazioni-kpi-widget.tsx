"use client";

import Link from "next/link";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { LoadingCardSkeleton } from "@/components/design-system";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { dsDashboardWidgetTitle, dsFocus, dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { statoLavorazioneLabel } from "@/src/shared/selectors";

const severityBorder: Record<string, string> = {
  normal: "border-[color:var(--cab-border)]",
  warning: "border-[color:color-mix(in_srgb,var(--cab-warning)_50%,var(--cab-border))]",
  critical: "border-[color:color-mix(in_srgb,var(--cab-danger)_50%,var(--cab-border))]",
};

function StatoGroupLabel({ statoId, statiOpts }: { statoId: string; statiOpts: readonly { id: string; label: string; color?: string }[] }) {
  const label = statoLavorazioneLabel(statoId, statiOpts) || statoId;
  const color = statoDisplayColor(statoId, statiOpts);
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function DashboardLavorazioniKpiWidget() {
  const { slices, isLoading } = useControlTowerContext();
  const buckets = slices?.wip.buckets ?? [];
  const { lavorazioni: lavOpts } = useGlobalOptions({ debugTag: "DashboardLavorazioniKpiWidget" });
  const statiOpts = lavOpts.stati;

  if (isLoading && buckets.length === 0) {
    return <LoadingCardSkeleton minHeightClass="min-h-[12rem]" rows={3} />;
  }

  return (
    <Link href="/lavorazioni" className={`${dsSurfaceCard} block min-w-0 ${dsFocus} p-4 sm:p-5`}>
      <h2 className={dsDashboardWidgetTitle}>Stato operativo — Lavorazioni</h2>
      {buckets.length === 0 ? (
        <p className={`${dsTypoCaption} mt-4`}>Nessuna lavorazione attiva.</p>
      ) : (
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
          {buckets.map((bucket) => (
            <div
              key={bucket.id}
              className={`rounded-lg border p-3 ${severityBorder[bucket.severity] ?? severityBorder.normal}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-[color:var(--cab-text)]">{bucket.label}</p>
                <span className="text-lg font-semibold tabular-nums">{bucket.total}</span>
              </div>
              <ul className="mt-2 space-y-2">
                {bucket.groups.map((g) => (
                  <li key={g.stato}>
                    <p className={`${dsTypoCaption} font-medium`}>
                      <StatoGroupLabel statoId={g.stato} statiOpts={statiOpts} />
                    </p>
                    <ul className="mt-1 space-y-1">
                      {g.rows.map((r) => {
                        const showMacchina = r.macchina.trim() && r.macchina !== "—";
                        return (
                          <li key={r.id} className="min-w-0 truncate text-sm text-[color:var(--cab-text)]">
                            {showMacchina ? <span className="font-medium">{r.macchina}</span> : null}
                            {r.mezzoIdent ? (
                              <span
                                className={`${dsTypoCaption} block truncate${showMacchina ? " text-[color:var(--cab-text-muted)]" : " font-medium text-[color:var(--cab-text)]"}`}
                              >
                                {r.mezzoIdent}
                              </span>
                            ) : null}
                            {r.addetto ? (
                              <span className={`${dsTypoCaption} block truncate text-[color:var(--cab-text-muted)]`}>
                                {r.addetto}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
