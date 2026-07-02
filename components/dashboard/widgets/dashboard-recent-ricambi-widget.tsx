"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
} from "@/components/gestionale/gestionale-log-ui";
import { LoadingFormSkeleton } from "@/components/design-system";
import {
  buildLogModificheDisplayEntries,
  buildLogModificheFocusHref,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { layoutScrollYSafe } from "@/lib/ui/responsive-layout-core";
import { dsDashboardWidgetTitle, dsSurfaceCard } from "@/lib/ui/design-system";
import { GESTIONALE_LOG_FEED_LIMIT } from "@/lib/react-query/query-layer-policies";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";

const dashboardFeedScrollClass = layoutScrollYSafe;

export function DashboardRecentRicambiWidget() {
  const router = useRouter();
  const staging = isStagingPublicSlice();
  const { user } = useAuth();
  const authorName = user?.nome?.trim() || user?.email?.split("@")[0]?.trim() || "Operatore";

  const viewOpts = useViewQueryOpts({ staleTime: 90_000 });

  const magLogsQ = useLogListQuery(
    { entita: "magazzino_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: !staging, ...viewOpts },
  );

  const magSlice = useMemo(() => {
    return buildLogModificheDisplayEntries(magLogsQ.data ?? [], (row) =>
      logAutoreLabel(row, user?.id ?? null, authorName),
    )
      .slice(0, 8)
      .map((entry) => ({
        id: entry.id,
        vm: entry.vm,
        href: buildLogModificheFocusHref(entry.row),
      }));
  }, [authorName, magLogsQ.data, user?.id]);

  if (staging) return null;

  return (
    <section className={`flex min-h-[280px] min-w-0 max-w-full flex-col overflow-hidden ${dsSurfaceCard} p-4 sm:p-5`}>
      <h2 className={dsDashboardWidgetTitle}>Ultime modifiche ricambi</h2>
      <div className={`${dashboardFeedScrollClass} mt-3 max-h-[min(360px,52vh)] min-h-0 min-w-0 flex-1 pr-1`}>
        {magLogsQ.isLoading ? (
          <LoadingFormSkeleton fields={2} className="py-1" />
        ) : magSlice.length === 0 ? (
          <GestionaleLogEmpty message="Nessuna modifica registrata. Le operazioni su Magazzino compaiono qui automaticamente." />
        ) : (
          <GestionaleLogList>
            {magSlice.map(({ id, vm, href }) => (
              <li key={id} className="list-none min-w-0 max-w-full">
                <GestionaleLogEntryFourLines
                  vm={vm}
                  onClick={href ? () => router.push(href) : undefined}
                  title={href ? "Apri in Magazzino" : undefined}
                />
              </li>
            ))}
          </GestionaleLogList>
        )}
      </div>
    </section>
  );
}
