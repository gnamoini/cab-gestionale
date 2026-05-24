"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import {
  buildLogModificheDisplayEntries,
  buildLogModificheFocusHref,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { dsSurfaceCard, dsTypoCardTitle } from "@/lib/ui/design-system";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";

export function DashboardRecentFeeds() {
  const router = useRouter();
  const staging = isStagingPublicSlice();
  const { user } = useAuth();
  const authorName = user?.nome?.trim() || user?.email?.split("@")[0]?.trim() || "Operatore";

  const viewOpts = useViewQueryOpts({ staleTime: 90_000 });
  const globalOpts = useGlobalOptions({ debugTag: "DashboardRecentFeeds" });
  const statiLavorazione = globalOpts.lavorazioni.stati;

  const lavLogsQ = useLogListQuery({ entita: "lavorazioni", limit: 12 }, { enabled: !staging, ...viewOpts });
  const magLogsQ = useLogListQuery({ entita: "magazzino_ricambi", limit: 12 }, { enabled: !staging, ...viewOpts });

  const lavSlice = useMemo(() => {
    return buildLogModificheDisplayEntries(lavLogsQ.data ?? [], (row) =>
      logAutoreLabel(row, user?.id ?? null, authorName),
      { statiLavorazione },
    )
      .slice(0, 8)
      .map((entry) => ({
        id: entry.id,
        vm: entry.vm,
        href: buildLogModificheFocusHref(entry.row),
      }));
  }, [authorName, lavLogsQ.data, statiLavorazione, user?.id]);

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
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={`flex min-h-[280px] flex-col ${dsSurfaceCard} p-4 sm:p-5`}>
        <h2 className={dsTypoCardTitle}>Ultime modifiche lavorazioni</h2>
        <div className={`${gestionaleLogScrollEmbeddedClass} mt-3 max-h-[min(360px,52vh)] min-h-0 flex-1 pr-1`}>
          {lavLogsQ.isLoading ? (
            <p className="text-sm text-zinc-500">Caricamento log…</p>
          ) : lavSlice.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata. Le operazioni su Lavorazioni compaiono qui automaticamente." />
          ) : (
            <GestionaleLogList>
              {lavSlice.map(({ id, vm, href }) => (
                <li key={id} className="list-none">
                  <GestionaleLogEntryFourLines
                    vm={vm}
                    onClick={href ? () => router.push(href) : undefined}
                    title={href ? "Apri in Lavorazioni" : undefined}
                  />
                </li>
              ))}
            </GestionaleLogList>
          )}
        </div>
      </section>

      <section className={`flex min-h-[280px] flex-col ${dsSurfaceCard} p-4 sm:p-5`}>
        <h2 className={dsTypoCardTitle}>Ultime modifiche ricambi</h2>
        <div className={`${gestionaleLogScrollEmbeddedClass} mt-3 max-h-[min(360px,52vh)] min-h-0 flex-1 pr-1`}>
          {magLogsQ.isLoading ? (
            <p className="text-sm text-zinc-500">Caricamento log…</p>
          ) : magSlice.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata. Le operazioni su Magazzino compaiono qui automaticamente." />
          ) : (
            <GestionaleLogList>
              {magSlice.map(({ id, vm, href }) => (
                <li key={id} className="list-none">
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
