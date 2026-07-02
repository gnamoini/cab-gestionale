"use client";

import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { dsDashboardWidgetTitle, dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";

export function DashboardOperationalCalendarWidget() {
  const { slices } = useControlTowerContext();
  const items = slices?.calendar.items ?? [];

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <h2 className={dsDashboardWidgetTitle}>Prossime scadenze</h2>
      <p className={`${dsTypoCaption} mt-1`}>7 giorni</p>
      {items.length === 0 ? (
        <p className={`${dsTypoCaption} mt-4`}>Nessuna scadenza operativa in programma.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-[color:var(--cab-border)] px-3 py-2">
              <span className={`${dsTypoCaption} shrink-0 tabular-nums`}>
                {new Date(item.ymd + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
              </span>
              <span className="min-w-0 truncate text-sm font-medium text-[color:var(--cab-text)]">{item.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
