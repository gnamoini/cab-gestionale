"use client";

import Link from "next/link";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { LoadingCardSkeleton } from "@/components/design-system";
import { dsDashboardWidgetTitle, dsFocus, dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";

const severityBorder: Record<string, string> = {
  normal: "border-[color:var(--cab-border)]",
  warning: "border-[color:color-mix(in_srgb,var(--cab-warning)_50%,var(--cab-border))]",
  critical: "border-[color:color-mix(in_srgb,var(--cab-danger)_50%,var(--cab-border))]",
};

export function DashboardLavorazioniKpiWidget() {
  const { slices, isLoading } = useControlTowerContext();
  const buckets = slices?.wip.buckets ?? [];

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
                    <p className={`${dsTypoCaption} font-medium`}>{g.stato}</p>
                    <ul className="mt-1 space-y-1">
                      {g.rows.map((r) => (
                        <li key={r.id} className="truncate text-sm text-[color:var(--cab-text)]">
                          {r.macchina}
                          {r.mezzoIdent ? <span className={`${dsTypoCaption} block truncate`}>{r.mezzoIdent}</span> : null}
                        </li>
                      ))}
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
