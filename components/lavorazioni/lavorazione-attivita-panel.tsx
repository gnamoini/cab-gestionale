"use client";

import { Tooltip } from "@/components/ui";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { useMemo, useState } from "react";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
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
import { formatGestionaleLogMetaLine, type GestionaleLogEventTone } from "@/lib/gestionale-log/view-model";
import {
  dsFocus,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
} from "@/lib/ui/design-system";

const FILTER_OPTIONS: { id: LavorazioneAttivitaFilter; label: string; shortLabel: string }[] = [
  { id: "all", label: "Tutto", shortLabel: "Tutto" },
  { id: "stati", label: "Solo stati", shortLabel: "Stati" },
  { id: "important", label: "Solo importanti", shortLabel: "Importanti" },
];

const TIMELINE_RING =
  "ring-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))]";

const TONE_DOT: Record<GestionaleLogEventTone, string> = {
  create: "bg-emerald-500",
  update: "bg-[color:var(--cab-primary)]",
  delete: "bg-red-500",
  complete: "bg-sky-500",
  archive: "bg-[color:var(--cab-text-muted)]",
  reopen: "bg-indigo-500",
  neutral: "bg-[color:var(--cab-text-muted)]",
};

function timelineDotClass(tier: LavorazioneAttivitaEvent["tier"], tone: GestionaleLogEventTone): string {
  if (tier === "stato") return `h-3 w-3 bg-[color:var(--cab-primary)] ring-[3px] ${TIMELINE_RING}`;
  if (tier === "secondary") return `h-2 w-2 bg-[color:var(--cab-text-muted)] opacity-50 ring-2 ${TIMELINE_RING}`;
  return `h-2.5 w-2.5 ring-2 ${TIMELINE_RING} ${TONE_DOT[tone]}`;
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
  const isStato = ev.tier === "stato";
  const isSecondary = ev.tier === "secondary";

  return (
    <li className="relative flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="relative flex w-5 shrink-0 justify-center pt-1">
        {index < total - 1 ? (
          <span
            className="absolute top-4 bottom-0 left-1/2 w-px -translate-x-1/2 bg-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)]"
            aria-hidden
          />
        ) : null}
        <span
          className={`relative z-10 shrink-0 rounded-full ${timelineDotClass(ev.tier, ev.tone)}`}
          aria-hidden
        />
      </div>
      <div
        className={`min-w-0 flex-1 ${
          isStato
            ? "rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] px-2.5 py-2"
            : isSecondary
              ? "opacity-75"
              : ""
        }`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={`min-w-0 uppercase tracking-wide ${
              isStato
                ? "text-xs font-bold text-[color:var(--cab-text)]"
                : isSecondary
                  ? "text-[10px] font-semibold text-[color:var(--cab-text-muted)]"
                  : "text-xs font-bold text-[color:var(--cab-text)]"
            }`}
          >
            {ev.title}
          </p>
          {statoLabel && isStato ? (
            <span
              className={`${statoPillShellClassDynamic()} inline-flex px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap`}
              style={statoStyle}
            >
              {statoLabel}
            </span>
          ) : null}
        </div>
        <p
          className={`whitespace-pre-wrap leading-relaxed text-[color:var(--cab-text-muted)] ${
            isSecondary ? "mt-0.5 text-[11px]" : "mt-1 text-sm"
          }`}
        >
          {ev.description}
        </p>
        <p className="mt-1.5 text-[10px] tabular-nums text-[color:var(--cab-text-muted)]">
          {formatGestionaleLogMetaLine(ev.autore, ev.at)}
        </p>
      </div>
    </li>
  );
}

function AttivitaFilterSegmented({
  filter,
  onChange,
}: {
  filter: LavorazioneAttivitaFilter;
  onChange: (next: LavorazioneAttivitaFilter) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Visualizza
      </p>
      <div
        className={`${dsSegmentedWrap} w-full min-w-0 gap-0.5 p-0.5`}
        role="group"
        aria-label="Filtro attività"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.id;
          return (
            <Tooltip content={opt.label}><button key={opt.id} type="button" className={`flex min-h-10 min-w-0 flex-1 items-center justify-center px-2 text-center text-xs font-semibold sm:min-h-9 sm:px-3 sm:text-sm ${active ? dsSegmentedBtnOn : dsSegmentedBtnOff} ${dsFocus}`} aria-pressed={active} onClick={() => onChange(opt.id)}>
              <span className="sm:hidden">{opt.shortLabel}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button></Tooltip>
          );
        })}
      </div>
    </div>
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

  const subtitle =
    filter === "all"
      ? allEvents.length === 1
        ? "1 evento registrato"
        : `${allEvents.length} eventi registrati`
      : events.length === 1
        ? `1 di ${allEvents.length} eventi`
        : `${events.length} di ${allEvents.length} eventi`;

  return (
    <GestionaleInfoCard compact title="Attività lavorazione" subtitle={subtitle}>
      <AttivitaFilterSegmented filter={filter} onChange={setFilter} />
      <div className="mt-3.5 border-t border-[color:var(--cab-border)] pt-3.5">
        {events.length === 0 ? (
          <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-4 text-center">
            <p className="text-sm font-medium text-[color:var(--cab-text)]">
              {allEvents.length === 0 ? "Nessuna attività" : "Nessun evento per questo filtro"}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
              {allEvents.length === 0 ? emptyMessage : "Prova un altro filtro per vedere più eventi."}
            </p>
          </div>
        ) : (
          <ol className={`${LIST_DIVIDER_UL}`}>
            {events.map((ev, index) => (
              <AttivitaEventRow
                key={ev.id}
                ev={ev}
                index={index}
                total={events.length}
                statiOpts={feedInput?.statiOpts ?? []}
              />
            ))}
          </ol>
        )}
      </div>
    </GestionaleInfoCard>
  );
}
