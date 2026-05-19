"use client";

import type { CSSProperties } from "react";
import { statoPillShellClassDynamic } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  buildClientTimelineEvents,
  buildClientTimelineHeader,
  fmtClientTimelineWhen,
  type ClientTimelineEvent,
} from "@/lib/lavorazioni/client-portal-timeline";
import { buildClientPortalRowFields } from "@/lib/lavorazioni/client-portal-row-fields";
import { fmtClientUpdatedAt } from "@/lib/lavorazioni/client-portal-ui";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

function TimelineIdentityHeader({ header }: { header: ReturnType<typeof buildClientTimelineHeader> }) {
  const identLine = [header.targa !== "—" ? header.targa : null, header.matricola !== "—" ? header.matricola : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface-2)] px-4 py-3.5 sm:px-5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Lavorazione</p>
      <h2 className="mt-1 text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{header.cliente}</h2>
      <p className="mt-1 text-sm font-medium leading-snug text-zinc-700 dark:text-zinc-200">{header.attrezzatura}</p>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Cantiere</p>
          <p className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-100">{header.cantiere}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Targa / Matricola</p>
          <p className="mt-0.5 font-mono text-sm font-medium text-zinc-800 dark:text-zinc-100">{identLine || "—"}</p>
        </div>
      </div>
    </header>
  );
}

function TimelineMetadataBar({
  dataIngresso,
  statoLabel,
  statoStyle,
  addetto,
  ultimaModifica,
}: {
  dataIngresso: string;
  statoLabel: string;
  statoStyle?: CSSProperties;
  addetto: string;
  ultimaModifica: string;
}) {
  return (
    <section
      aria-label="Metadati lavorazione"
      className="grid gap-3 rounded-xl border border-[color:var(--cab-border)] bg-white px-4 py-3.5 dark:bg-zinc-950/30 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Data ingresso</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{dataIngresso}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Stato</p>
        <div className="mt-1">
          <span
            className={`${statoPillShellClassDynamic()} inline-flex px-2.5 py-1 text-xs font-semibold whitespace-nowrap`}
            style={statoStyle}
          >
            {statoLabel}
          </span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Addetto</p>
        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{addetto}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Ultima modifica</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{ultimaModifica}</p>
      </div>
    </section>
  );
}

function TimelineEventsSection({ events }: { events: ClientTimelineEvent[] }) {
  const chronological = [...events].reverse();

  return (
    <section aria-label="Avanzamento lavorazione">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Avanzamento</h3>
      {chronological.length === 0 ? (
        <p className="text-sm text-zinc-500">Nessun evento registrato.</p>
      ) : (
        <ol className="space-y-0">
          {chronological.map((ev, index) => (
            <li key={ev.id} className="grid grid-cols-[1.125rem_minmax(0,1fr)] gap-x-4 pb-6 last:pb-0">
              <div className="relative flex justify-center">
                {index < chronological.length - 1 ? (
                  <span className="absolute top-3 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
                ) : null}
                <span
                  className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500 ring-2 ring-white dark:ring-zinc-900"
                  aria-hidden
                />
              </div>
              <div className="min-w-0 pt-0.5 pl-0.5">
                <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{ev.title}</p>
                {ev.subtitle ? (
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{ev.subtitle}</p>
                ) : null}
                <p className="mt-1 text-xs tabular-nums text-zinc-500">{fmtClientTimelineWhen(ev.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function ClientLavorazioneTimelinePanel({
  row,
  schedeStore,
  logs,
  addettiGlobali,
  statiOpts,
  statoLabel,
  statoStyle,
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  logs: readonly LogModificaRow[];
  addettiGlobali: readonly string[];
  statiOpts: { id: string; label: string; color?: string }[];
  statoLabel: string;
  statoStyle?: CSSProperties;
}) {
  const header = buildClientTimelineHeader(row, schedeStore);
  const fields = buildClientPortalRowFields(row, schedeStore, logs, addettiGlobali);
  const events = buildClientTimelineEvents(logs, statiOpts);

  return (
    <div className="space-y-5">
      <TimelineIdentityHeader header={header} />
      <TimelineMetadataBar
        dataIngresso={fields.dataIngresso}
        statoLabel={statoLabel}
        statoStyle={statoStyle}
        addetto={fields.addetto}
        ultimaModifica={fmtClientUpdatedAt(row.updated_at)}
      />
      <TimelineEventsSection events={events} />
    </div>
  );
}

/** Titolo pagina dettaglio — nessun codice tecnico. */
export function clientTimelinePageTitle(header: ReturnType<typeof buildClientTimelineHeader>): string {
  return header.identificativo;
}
