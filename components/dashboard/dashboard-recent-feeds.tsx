"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
} from "@/components/gestionale/gestionale-log-ui";
import { layoutScrollYSafe } from "@/lib/ui/responsive-layout-core";
import {
  buildLavorazioneLogOggettoResolver,
  buildLogModificheDisplayEntries,
  buildLogModificheFocusHref,
  briefLogModificaRiga,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { LoadingFormSkeleton } from "@/components/design-system";
import { dsDashboardWidgetTitle, dsSurfaceCard } from "@/lib/ui/design-system";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const dashboardFeedScrollClass = layoutScrollYSafe;

export function DashboardRecentFeeds() {
  const router = useRouter();
  const staging = isStagingPublicSlice();
  const { user } = useAuth();
  const authorName = user?.nome?.trim() || user?.email?.split("@")[0]?.trim() || "Operatore";

  const viewOpts = useViewQueryOpts({ staleTime: 90_000 });
  const globalOpts = useGlobalOptions({ debugTag: "DashboardRecentFeeds" });
  const statiLavorazione = globalOpts.lavorazioni.stati;

  const lavListQ = useLavorazioniList({ includeMezzo: true }, { enabled: !staging, ...viewOpts });
  const { store: schedeStore } = useSchedeBundlesQuery(!staging, { viewLayer: true });

  const lavorazioniById = useMemo(() => {
    const map = new Map<string, LavorazioneListRow>();
    for (const row of lavListQ.data ?? []) map.set(row.id, row);
    return map;
  }, [lavListQ.data]);

  const resolveLavorazioneOggetto = useMemo(
    () => buildLavorazioneLogOggettoResolver(lavorazioniById, schedeStore),
    [lavorazioniById, schedeStore],
  );

  const lavLogsQ = useLogListQuery({ entita: "lavorazioni", limit: 12 }, { enabled: !staging, ...viewOpts });
  const magLogsQ = useLogListQuery({ entita: "magazzino_ricambi", limit: 12 }, { enabled: !staging, ...viewOpts });

  const lavSlice = useMemo(() => {
    return buildLogModificheDisplayEntries(lavLogsQ.data ?? [], (row) =>
      logAutoreLabel(row, user?.id ?? null, authorName),
      { statiLavorazione, resolveOggetto: resolveLavorazioneOggetto },
    )
      .slice(0, 8)
      .map((entry) => ({
        id: entry.id,
        vm: {
          ...entry.vm,
          modificaRiga: briefLogModificaRiga(entry.vm.modificaRiga),
        },
        href: buildLogModificheFocusHref(entry.row),
      }));
  }, [authorName, lavLogsQ.data, resolveLavorazioneOggetto, statiLavorazione, user?.id]);

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
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <section className={`flex min-h-[280px] min-w-0 max-w-full flex-col overflow-hidden ${dsSurfaceCard} p-4 sm:p-5`}>
        <h2 className={dsDashboardWidgetTitle}>Ultime modifiche lavorazioni</h2>
        <div className={`${dashboardFeedScrollClass} mt-3 max-h-[min(360px,52vh)] min-h-0 min-w-0 flex-1 pr-1`}>
          {lavLogsQ.isLoading ? (
            <LoadingFormSkeleton fields={2} className="py-1" />
          ) : lavSlice.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata. Le operazioni su Lavorazioni compaiono qui automaticamente." />
          ) : (
            <GestionaleLogList>
              {lavSlice.map(({ id, vm, href }) => (
                <li key={id} className="list-none min-w-0 max-w-full">
                  <GestionaleLogEntryFourLines
                    vm={vm}
                    onClick={href ? () => router.push(href) : undefined}
                    title={href ? "Apri lavorazione e evidenzia riga" : undefined}
                  />
                </li>
              ))}
            </GestionaleLogList>
          )}
        </div>
      </section>

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
    </div>
  );
}
