"use client";

import { useEffect, useMemo, useState } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import {
  buildMezziGestionaleLogViewModel,
  GestionaleLogEntryFourLines,
} from "@/components/gestionale/gestionale-log-ui";
import { MezzoAnagraficaHistoryEntry } from "@/components/gestionale/mezzi/mezzo-anagrafica-history-entry";
import { MezzoAssociationChangeEntry } from "@/components/gestionale/mezzi/mezzo-association-change-entry";
import { isAssociationHistoryEntry } from "@/lib/domain/mezzo/mezzo-association";
import { MezziHubTimelineEventRow } from "@/components/gestionale/mezzi/mezzi-hub-timeline-event-row";
import { MezziHubTimelineLavorazioneBlock } from "@/components/gestionale/mezzi/mezzi-hub-timeline-lavorazione-block";
import { MezziHubErrorBanner, MezziHubTabEmpty } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import type { MezziHubLogEntry } from "@/lib/mezzi/mezzi-db-ui-adapter";
import {
  MEZZO_TIMELINE_PAGE_SIZE,
  buildMezzoTimelineFeed,
  countMezzoTimelineFeedEvents,
  filterMezzoTimelineFeed,
  type MezzoTimelineFilter,
  type MezzoTimelineFeedTopItem,
  type MezzoTimelineLavorazioneBlock,
} from "@/lib/mezzi/mezzo-timeline-feed";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { MezzoHubData } from "@/src/services/domain/mezzo-domain.service";
import { useMezzoAnagraficaHistory } from "@/src/hooks/gestionale/use-mezzo-anagrafica-history";
import type { MezzoAnagraficaHistoryRow } from "@/src/services/mezzo-anagrafica-history.service";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import {
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
} from "@/lib/ui/design-system";

const FILTER_OPTIONS: { id: MezzoTimelineFilter; label: string; shortLabel: string }[] = [
  { id: "all", label: "Tutto", shortLabel: "Tutto" },
  { id: "lavorazioni", label: "Lavorazioni", shortLabel: "Lav." },
  { id: "anagrafica", label: "Anagrafica", shortLabel: "Anag." },
  { id: "tagliandi", label: "Tagliandi", shortLabel: "Tagl." },
  { id: "sistema", label: "Sistema", shortLabel: "Sist." },
];

const EMPTY_BY_FILTER: Record<Exclude<MezzoTimelineFilter, "all">, string> = {
  lavorazioni: "Nessun blocco lavorazione con eventi registrati.",
  anagrafica: "Nessuna modifica anagrafica in timeline.",
  tagliandi: "Nessun evento tagliando per questo mezzo.",
  sistema: "Nessun evento di sistema registrato.",
};

function blockDefaultExpanded(
  block: MezzoTimelineLavorazioneBlock,
  filter: MezzoTimelineFilter,
  isNewestBlock: boolean,
): boolean {
  if (filter === "lavorazioni") return true;
  if (filter === "tagliandi") return block.categories.includes("tagliando");
  if (filter === "all") {
    if (isNewestBlock) return true;
    return block.eventCount <= 3;
  }
  return block.eventCount <= 3;
}

function StandaloneTimelineRow({
  item,
  onClose,
}: {
  item: Extract<MezzoTimelineFeedTopItem, { kind: "standalone" }>;
  onClose: () => void;
}) {
  const ev = item.event;
  if (ev.renderKind === "log_modifiche") {
    const entry = ev.payload as MezziHubLogEntry;
    return (
      <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] p-3">
        <GestionaleLogEntryFourLines
          vm={buildMezziGestionaleLogViewModel({
            tipo: entry.tipo,
            mezzo: entry.mezzo,
            riepilogo: entry.riepilogo,
            autore: entry.autore,
            at: entry.at,
            changes: entry.changes,
            azione: entry.azione,
            tipoRiga: entry.tipoRiga,
            modifiche: entry.modifiche,
          })}
        />
      </div>
    );
  }
  if (ev.renderKind === "anagrafica_history") {
    const entry = ev.payload as MezzoAnagraficaHistoryRow;
    const HistoryEntry = isAssociationHistoryEntry(entry.changed_fields as string[])
      ? MezzoAssociationChangeEntry
      : MezzoAnagraficaHistoryEntry;
    return (
      <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] p-3">
        <ul>
          <HistoryEntry entry={entry} onNavigate={onClose} />
        </ul>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] p-3">
      <MezziHubTimelineEventRow event={ev} onClose={onClose} />
    </div>
  );
}

export function MezziHubTimelinePanel({
  mezzoId,
  hubData,
  interventi,
  active,
  onClose,
}: {
  mezzoId: string;
  hubData: MezzoHubData | undefined;
  interventi: readonly MezzoInterventoLavorazione[];
  active: boolean;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<MezzoTimelineFilter>("all");
  const anagraficaHistoryQ = useMezzoAnagraficaHistory(mezzoId, { enabled: active });

  const fullFeed = useMemo(() => {
    if (!hubData) return [];
    return buildMezzoTimelineFeed({
      mezzoId,
      timeline: hubData.timeline,
      logEntries: hubData.log,
      anagraficaHistory: anagraficaHistoryQ.data ?? [],
      interventi,
    });
  }, [hubData, mezzoId, interventi, anagraficaHistoryQ.data]);

  const filteredFeed = useMemo(
    () => filterMezzoTimelineFeed(fullFeed, filter),
    [fullFeed, filter],
  );

  const eventCount = countMezzoTimelineFeedEvents(fullFeed);

  const newestBlockId = useMemo(() => {
    const first = fullFeed.find((i) => i.kind === "lavorazioneBlock");
    return first?.kind === "lavorazioneBlock" ? first.lavorazioneId : null;
  }, [fullFeed]);

  const { page, setPage, pageCount, sliceItems, showPager, label, resetPage } = useClientPagination(
    filteredFeed.length,
    MEZZO_TIMELINE_PAGE_SIZE,
  );

  useEffect(() => {
    resetPage();
  }, [mezzoId, filter, filteredFeed.length, resetPage]);

  const paged = useMemo(() => sliceItems(filteredFeed), [filteredFeed, sliceItems, page]);

  return (
    <GestionaleInfoCard
      title="Timeline"
      subtitle={`${eventCount} eventi · audit completo`}
      collapsible
      defaultCollapsed={eventCount === 0 && !anagraficaHistoryQ.isLoading}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[color:var(--cab-text-muted)]">Filtro:</span>
        <div className={dsSegmentedWrap}>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={filter === opt.id ? dsSegmentedBtnOn : dsSegmentedBtnOff}
              onClick={() => setFilter(opt.id)}
            >
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {anagraficaHistoryQ.isError ? (
        <MezziHubErrorBanner message={anagraficaHistoryQ.error?.message ?? "Errore storico anagrafica."} />
      ) : null}

      {anagraficaHistoryQ.isLoading && !anagraficaHistoryQ.data ? (
        <p className="mb-3 text-xs text-[color:var(--cab-text-muted)]">Caricamento storico campo per campo…</p>
      ) : null}

      {paged.length === 0 ? (
        <MezziHubTabEmpty
          message={
            filter === "all"
              ? "Nessun evento in timeline per questo mezzo."
              : EMPTY_BY_FILTER[filter]
          }
        />
      ) : (
        <div className="space-y-3">
          {paged.map((item) =>
            item.kind === "lavorazioneBlock" ? (
              <MezziHubTimelineLavorazioneBlock
                key={item.lavorazioneId}
                block={item}
                defaultExpanded={blockDefaultExpanded(
                  item,
                  filter,
                  item.lavorazioneId === newestBlockId,
                )}
                onClose={onClose}
              />
            ) : (
              <StandaloneTimelineRow key={item.event.id} item={item} onClose={onClose} />
            ),
          )}
          {showPager ? (
            <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
          ) : null}
        </div>
      )}
    </GestionaleInfoCard>
  );
}

/** Conteggio eventi per label tab (senza lazy history — usa solo hub). */
export function countMezzoHubTimelineTabEvents(
  hubData: MezzoHubData | undefined,
  mezzoId: string,
  interventi: readonly MezzoInterventoLavorazione[],
): number {
  if (!hubData) return 0;
  const feed = buildMezzoTimelineFeed({
    mezzoId,
    timeline: hubData.timeline,
    logEntries: hubData.log,
    anagraficaHistory: [],
    interventi,
  });
  return countMezzoTimelineFeedEvents(feed);
}
