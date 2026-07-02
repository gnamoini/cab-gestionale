"use client";

import { CONTROL_TOWER_ACTIVITY_WINDOW_LABEL } from "@/lib/dashboard/control-tower-constants";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { LoadingFormSkeleton } from "@/components/design-system";
import { dsDashboardWidgetTitle, dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";

const DOMAIN_LABELS = {
  lavorazioni: "Lavorazioni",
  magazzino: "Magazzino",
  amministrazione: "Amministrazione",
} as const;

export function DashboardRecentActivityWidget() {
  const { slices, isLoading, staging } = useControlTowerContext();
  if (staging) return null;

  const feed = slices?.activityFeed;
  const domains = (["lavorazioni", "magazzino", "amministrazione"] as const).filter(
    (d) => (feed?.byDomain[d].length ?? 0) > 0,
  );

  if (isLoading && !feed) {
    return (
      <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
        <LoadingFormSkeleton fields={2} />
      </section>
    );
  }

  if (domains.length === 0) {
    return (
      <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
        <h2 className={dsDashboardWidgetTitle}>Attività recenti</h2>
        <p className={`${dsTypoCaption} mt-2`}>{CONTROL_TOWER_ACTIVITY_WINDOW_LABEL} — nessun evento.</p>
      </section>
    );
  }

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={dsDashboardWidgetTitle}>Attività recenti</h2>
        <p className={dsTypoCaption}>{CONTROL_TOWER_ACTIVITY_WINDOW_LABEL}</p>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-3">
        {domains.map((domain) => (
          <div key={domain} className="min-w-0">
            <p className={`${dsTypoCaption} font-semibold uppercase tracking-wide`}>{DOMAIN_LABELS[domain]}</p>
            <ul className="mt-2 space-y-2">
              {feed!.byDomain[domain].map((item) => (
                <li key={item.id} className="min-w-0 border-b border-[color:var(--cab-border)] pb-2 last:border-0">
                  <p className="truncate text-sm font-medium text-[color:var(--cab-text)]">{item.label}</p>
                  <p className={`${dsTypoCaption} truncate`}>{item.detail}</p>
                  <p className={`${dsTypoCaption} tabular-nums`}>
                    {new Date(item.at).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
