"use client";

import { useCallback, useMemo } from "react";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import {
  HubModalPanoramicaFieldTile,
  HubModalPanoramicaFieldTiles,
  hubPanoramicaDisplayValue,
} from "@/components/design-system/hub-modal-panoramica";
import { ClientPortalStatoProgressTile } from "@/components/lavorazioni-clienti/client-portal-stato-progress";
import { buildClientPortalRowFields } from "@/lib/lavorazioni/client-portal-row-fields";
import {
  buildClientPortalStatoTimelineFromRow,
  buildClientTimelineHeader,
} from "@/lib/lavorazioni/client-portal-timeline";
import { fmtClientUpdatedAt } from "@/lib/lavorazioni/client-portal-ui";
import {
  buildLavorazioneRowProfileResolver,
  mergeLazyProfileNamesIntoResolver,
  resolveLavorazioneUltimaModifica,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { useAuth } from "@/context/auth-context";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useLavorazioneProfileNamesQuery } from "@/src/hooks/use-lavorazione-profile-names-query";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export function ClientLavorazioneTimelinePanel({
  row,
  schedeStore,
  addettiGlobali,
  statiOpts,
  statoId,
  statoLabel,
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  addettiGlobali: readonly string[];
  statiOpts: { id: string; label: string; color?: string }[];
  statoId: string;
  statoLabel: string;
}) {
  const { user, authorName } = useAuth();
  const globalOpts = useGlobalOptions({ debugTag: "ClientLavorazioneTimeline" });
  const header = buildClientTimelineHeader(row, schedeStore);
  const fields = buildClientPortalRowFields(
    row,
    schedeStore,
    addettiGlobali,
    globalOpts.lavorazioni.addettiRecords,
  );
  const bundle = useMemo(() => getOrCreateBundle(schedeStore, row.id), [schedeStore, row.id]);

  const profileUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (row.updated_by?.trim()) ids.add(row.updated_by.trim());
    if (row.created_by?.trim()) ids.add(row.created_by.trim());
    return [...ids];
  }, [row.created_by, row.updated_by]);
  const lazyProfileNames = useLavorazioneProfileNamesQuery(profileUserIds);
  const resolveProfile = useCallback(
    () =>
      mergeLazyProfileNamesIntoResolver(
        buildLavorazioneRowProfileResolver(row, user?.id ?? null, authorName),
        lazyProfileNames,
      ),
    [authorName, lazyProfileNames, row, user?.id],
  );

  const ultimaModificaLabel = useMemo(() => {
    const info = resolveLavorazioneUltimaModifica(row, bundle, {
      resolveUserId: resolveProfile(),
      omitUnresolvedAutore: true,
    });
    const when = fmtClientUpdatedAt(info.iso);
    const autore = info.autore.trim();
    if (!when || when === "—") return "—";
    if (!autore || autore === "—") return when;
    return `${when} · ${autore}`;
  }, [row, bundle, resolveProfile]);

  const timelineEvents = useMemo(
    () =>
      buildClientPortalStatoTimelineFromRow(statiOpts, {
        anchorAt: row.created_at ?? row.data_ingresso ?? undefined,
        currentStatoId: row.stato,
        currentAt: row.updated_at,
      }),
    [statiOpts, row.created_at, row.data_ingresso, row.stato, row.updated_at],
  );

  return (
    <GestionaleInfoCard title="Panoramica">
      <HubModalPanoramicaFieldTiles className="sm:grid-cols-2 lg:grid-cols-3">
        <HubModalPanoramicaFieldTile label="Cliente" value={hubPanoramicaDisplayValue(header.cliente)} largeValue />
        <HubModalPanoramicaFieldTile label="Cantiere" value={hubPanoramicaDisplayValue(header.cantiere)} />
        <HubModalPanoramicaFieldTile
          label="Data ingresso"
          value={hubPanoramicaDisplayValue(fields.dataIngresso)}
          largeValue
        />
        <ClientPortalStatoProgressTile
          className="sm:col-span-2"
          statiOpts={statiOpts}
          currentStatoId={statoId}
          currentLabel={statoLabel}
          timelineEvents={timelineEvents}
        />
        <div className="flex min-w-0 flex-col gap-2 self-start">
          <HubModalPanoramicaFieldTile
            label="Addetto"
            value={hubPanoramicaDisplayValue(fields.addetto)}
          />
          {ultimaModificaLabel !== "—" ? (
            <HubModalPanoramicaFieldTile
              label="Ultima modifica"
              value={hubPanoramicaDisplayValue(ultimaModificaLabel)}
            />
          ) : null}
        </div>
      </HubModalPanoramicaFieldTiles>
    </GestionaleInfoCard>
  );
}

/** Titolo pagina dettaglio — nessun codice tecnico. */
export function clientTimelinePageTitle(header: ReturnType<typeof buildClientTimelineHeader>): string {
  return header.identificativo;
}

/** Titolo compatto mobile/tablet — solo Lavorazione + codice. */
export function clientTimelinePageTitleCompact(header: ReturnType<typeof buildClientTimelineHeader>): string {
  return header.identificativoCompact;
}
