"use client";

import { useRouter } from "next/navigation";
import { CONTROL_TOWER_ACTIVITY_WINDOW_LABEL } from "@/lib/dashboard/control-tower-constants";
import type { ControlTowerActivityFeedSlice } from "@/lib/dashboard/control-tower-selectors";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
} from "@/components/gestionale/gestionale-log-ui";
import { LoadingFormSkeleton } from "@/components/design-system";
import { layoutScrollYSafe } from "@/lib/ui/responsive-layout-core";
import { dsDashboardWidgetTitle, dsSurfaceCard, dsTypoCaption } from "@/lib/ui/design-system";

type ActivityDomain = keyof ControlTowerActivityFeedSlice["byDomain"];

const ACTIVITY_COLUMNS: { id: ActivityDomain; label: string }[] = [
  { id: "lavorazioni", label: "Lavorazioni" },
  { id: "ricambi", label: "Ricambi" },
  { id: "amministrazione", label: "Amministrazione" },
];

const activityScrollClass = `${layoutScrollYSafe} max-h-[min(420px,52vh)] min-h-0 pr-1`;

const ACTIVITY_EMPTY_MESSAGES: Record<ActivityDomain, string> = {
  lavorazioni: "Nessuna attività sulle lavorazioni in questo periodo.",
  ricambi: "Nessuna attività sui ricambi in questo periodo.",
  amministrazione: "Nessuna attività amministrativa in questo periodo.",
};

export function DashboardRecentActivityWidget() {
  const router = useRouter();
  const { slices, isLoading, staging, canLavorazioni, canMagazzino, canPreventivi, canFatturazione } =
    useControlTowerContext();
  if (staging) return null;

  const feed = slices?.activityFeed;
  const columns = ACTIVITY_COLUMNS.filter((col) => {
    if (col.id === "lavorazioni") return canLavorazioni;
    if (col.id === "ricambi") return canMagazzino;
    return canPreventivi || canFatturazione;
  });

  if (isLoading && !feed) {
    return (
      <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
        <LoadingFormSkeleton fields={2} />
      </section>
    );
  }

  if (columns.length === 0) return null;

  const allEmpty = columns.every((col) => (feed?.byDomain[col.id] ?? []).length === 0);

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={dsDashboardWidgetTitle}>Attività recenti</h2>
        <p className={dsTypoCaption}>{CONTROL_TOWER_ACTIVITY_WINDOW_LABEL}</p>
      </div>
      {allEmpty ? (
        <div className="mt-4 min-w-0">
          <GestionaleLogEmpty
          message={`Nessuna attività registrata (${CONTROL_TOWER_ACTIVITY_WINDOW_LABEL.toLowerCase()}). Le modifiche su lavorazioni, ricambi e amministrazione compaiono qui automaticamente.`}
          />
        </div>
      ) : (
        <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-3">
          {columns.map((col) => {
            const items = feed?.byDomain[col.id] ?? [];
            return (
              <div key={col.id} className="flex min-h-0 min-w-0 flex-col">
                <p className={`${dsTypoCaption} font-semibold uppercase tracking-wide`}>{col.label}</p>
                <div className={`${activityScrollClass} mt-2 min-w-0 flex-1`}>
                  {items.length === 0 ? (
                    <GestionaleLogEmpty message={ACTIVITY_EMPTY_MESSAGES[col.id]} />
                  ) : (
                    <GestionaleLogList>
                      {items.map((item) => (
                        <li key={item.id} className="list-none min-w-0">
                          <GestionaleLogEntryFourLines
                            vm={item.vm}
                            onClick={item.href ? () => router.push(item.href!) : undefined}
                            title={item.href ? "Apri dettaglio" : undefined}
                          />
                        </li>
                      ))}
                    </GestionaleLogList>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
