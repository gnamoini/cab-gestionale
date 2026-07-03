"use client";

import type { CSSProperties } from "react";
import {
  GestionaleInfoCard,
  GestionaleInfoRow,
} from "@/components/design-system/gestionale-info-card";
import {
  HubModalPanoramicaStatusPill,
  hubPanoramicaDisplayValue,
} from "@/components/design-system/hub-modal-panoramica";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { buildClientPortalRowFields } from "@/lib/lavorazioni/client-portal-row-fields";
import {
  buildClientTimelineEvents,
  buildClientTimelineHeader,
  fmtClientTimelineWhen,
  type ClientTimelineEvent,
} from "@/lib/lavorazioni/client-portal-timeline";
import { fmtClientUpdatedAt } from "@/lib/lavorazioni/client-portal-ui";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { dsGapMd } from "@/lib/ui/design-system";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

function TimelineEventsList({ events }: { events: ClientTimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">Nessun evento registrato.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((ev, index) => (
        <li key={ev.id} className="grid grid-cols-[1.125rem_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
          <div className="relative flex justify-center">
            {index < events.length - 1 ? (
              <span className="absolute top-3 bottom-0 w-px bg-[color:var(--cab-border)]" aria-hidden />
            ) : null}
            <span
              className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--cab-primary)] ring-2 ring-[var(--cab-card)]"
              aria-hidden
            />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold leading-snug text-[color:var(--cab-text)]">{ev.title}</p>
            {ev.subtitle ? (
              <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{ev.subtitle}</p>
            ) : null}
            <p className="mt-0.5 text-xs tabular-nums text-[color:var(--cab-text-muted)]">
              {fmtClientTimelineWhen(ev.at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ClientLavorazioneAvanzamentoPanel({
  logs,
  statiOpts,
  row,
}: {
  logs: readonly LogModificaRow[];
  statiOpts: { id: string; label: string; color?: string }[];
  row: LavorazioneListRow;
}) {
  const events = buildClientTimelineEvents(logs, statiOpts, {
    anchorAt: row.created_at ?? row.data_ingresso ?? undefined,
  });

  return (
    <GestionaleInfoCard title="Avanzamento">
      <TimelineEventsList events={events} />
    </GestionaleInfoCard>
  );
}

export function ClientLavorazioneTimelinePanel({
  row,
  schedeStore,
  logs,
  addettiGlobali,
  statoLabel,
  statoStyle,
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  logs: readonly LogModificaRow[];
  addettiGlobali: readonly string[];
  statoLabel: string;
  statoStyle?: CSSProperties;
}) {
  const globalOpts = useGlobalOptions({ debugTag: "ClientLavorazioneTimeline" });
  const header = buildClientTimelineHeader(row, schedeStore);
  const fields = buildClientPortalRowFields(row, schedeStore, logs, addettiGlobali);

  const addettoPillStyle = readablePillStyleFromHex(
    addettoDisplayColor(fields.addetto, globalOpts.lavorazioni.addettoColors),
  );

  return (
    <div className={`flex flex-col ${dsGapMd}`}>
      <GestionaleInfoCard title="Riepilogo" subtitle={header.identificativo}>
        <GestionaleInfoRow label="Cliente" value={hubPanoramicaDisplayValue(header.cliente)} strong />
        <GestionaleInfoRow label="Cantiere" value={hubPanoramicaDisplayValue(header.cantiere)} />
        <GestionaleInfoRow label="Oggetto" value={hubPanoramicaDisplayValue(header.attrezzatura)} strong />
        {fields.entityBadge && fields.entityBadge !== "—" ? (
          <GestionaleInfoRow label="Tipo" value={fields.entityBadge} />
        ) : null}
      </GestionaleInfoCard>

      <GestionaleInfoCard title="Situazione">
        <GestionaleInfoRow
          label="Data ingresso"
          value={hubPanoramicaDisplayValue(fields.dataIngresso)}
          strong
        />
        <GestionaleInfoRow
          label="Stato"
          value={<HubModalPanoramicaStatusPill value={statoLabel} pillStyle={statoStyle} />}
        />
        <GestionaleInfoRow
          label="Addetto"
          value={
            <HubModalPanoramicaStatusPill
              value={hubPanoramicaDisplayValue(fields.addetto)}
              pillStyle={addettoPillStyle}
            />
          }
        />
        <GestionaleInfoRow
          label="Ultima modifica"
          value={hubPanoramicaDisplayValue(fmtClientUpdatedAt(row.updated_at))}
        />
      </GestionaleInfoCard>
    </div>
  );
}

/** Titolo pagina dettaglio — nessun codice tecnico. */
export function clientTimelinePageTitle(header: ReturnType<typeof buildClientTimelineHeader>): string {
  return header.identificativo;
}
