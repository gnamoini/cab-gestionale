"use client";

import { useMemo, useState } from "react";
import { statoPillShellClassDynamic } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  buildLavorazioneAttivitaFeed,
  filterLavorazioneAttivita,
  statoLabelForAttivita,
  type LavorazioneAttivitaEvent,
  type LavorazioneAttivitaFeedInput,
  type LavorazioneAttivitaFilter,
} from "@/lib/lavorazioni/lavorazione-attivita-feed";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { formatGestionaleLogMetaLine } from "@/lib/gestionale-log/view-model";

const FILTER_OPTIONS: { id: LavorazioneAttivitaFilter; label: string }[] = [
  { id: "all", label: "Tutto" },
  { id: "stati", label: "Solo stati" },
  { id: "important", label: "Solo importanti" },
];

function tierDotClass(tier: LavorazioneAttivitaEvent["tier"]): string {
  if (tier === "stato") return "h-3 w-3 bg-[var(--cab-primary)] ring-[3px]";
  if (tier === "secondary") return "h-2 w-2 bg-zinc-400/80 ring-2 opacity-70";
  return "h-2.5 w-2.5 bg-[var(--cab-primary)] ring-2";
}

function tierTitleClass(tier: LavorazioneAttivitaEvent["tier"]): string {
  if (tier === "stato") return "text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50";
  if (tier === "secondary") return "text-[11px] font-medium uppercase tracking-wide text-zinc-500/90 dark:text-zinc-500";
  return "text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100";
}

function tierBodyClass(tier: LavorazioneAttivitaEvent["tier"]): string {
  if (tier === "stato") return "mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300";
  if (tier === "secondary") return "mt-0.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500";
  return "mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400";
}

function tierRowPad(tier: LavorazioneAttivitaEvent["tier"]): string {
  if (tier === "secondary") return "pb-4 last:pb-0 pl-1";
  return "pb-6 last:pb-0";
}

function AttivitaEventRow({
  ev,
  index,
  total,
  statiOpts,
}: {
  ev: LavorazioneAttivitaEvent;
  index: number;
  total: number;
  statiOpts: { id: string; label: string; color?: string }[];
}) {
  const statoLabel = ev.statoId ? statoLabelForAttivita(ev.statoId, statiOpts) : null;
  const statoStyle = ev.statoId
    ? readablePillStyleFromHex(statoDisplayColor(ev.statoId, statiOpts))
    : undefined;

  return (
    <li className={`grid grid-cols-[1.125rem_minmax(0,1fr)] gap-x-4 ${tierRowPad(ev.tier)}`}>
      <div className="relative flex justify-center">
        {index < total - 1 ? (
          <span className="absolute top-3 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
        ) : null}
        <span
          className={`relative z-10 mt-1.5 shrink-0 rounded-full ring-white dark:ring-zinc-900 ${tierDotClass(ev.tier)}`}
          aria-hidden
        />
      </div>
      <div className={`min-w-0 pt-0.5 ${ev.tier === "secondary" ? "opacity-80" : ""}`}>
        <div className="flex flex-wrap items-start gap-2">
          <p className={tierTitleClass(ev.tier)}>{ev.title}</p>
          {statoLabel && ev.tier === "stato" ? (
            <span
              className={`${statoPillShellClassDynamic()} inline-flex px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap`}
              style={statoStyle}
            >
              {statoLabel}
            </span>
          ) : null}
        </div>
        <p className={`whitespace-pre-wrap ${tierBodyClass(ev.tier)}`}>{ev.description}</p>
        {ev.details ? <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-500">{ev.details}</p> : null}
        <p className="mt-1.5 text-[11px] tabular-nums text-zinc-500">{formatGestionaleLogMetaLine(ev.autore, ev.at)}</p>
      </div>
    </li>
  );
}

export function LavorazioneAttivitaPanel({
  feedInput,
  emptyMessage = "Nessuna attività registrata per questa lavorazione.",
}: {
  feedInput: LavorazioneAttivitaFeedInput | null;
  emptyMessage?: string;
}) {
  const [filter, setFilter] = useState<LavorazioneAttivitaFilter>("all");

  const allEvents = useMemo(
    () => (feedInput ? buildLavorazioneAttivitaFeed(feedInput) : []),
    [feedInput],
  );

  const events = useMemo(() => filterLavorazioneAttivita(allEvents, filter), [allEvents, filter]);

  return (
    <section aria-label="Attività lavorazione">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Attività lavorazione</h3>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtro attività">
          {FILTER_OPTIONS.map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                  active
                    ? "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_15%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
                onClick={() => setFilter(opt.id)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <ol className="space-y-0">
          {events.map((ev, index) => (
            <AttivitaEventRow key={ev.id} ev={ev} index={index} total={events.length} statiOpts={feedInput?.statiOpts ?? []} />
          ))}
        </ol>
      )}
    </section>
  );
}
