"use client";

import { useId, useState } from "react";
import { GestionaleCollapsiblePanel } from "@/components/design-system/gestionale-collapsible-panel";
import { MezziHubTimelineEventRow } from "@/components/gestionale/mezzi/mezzi-hub-timeline-event-row";
import {
  buildMezziGestionaleLogViewModel,
  GestionaleLogEntryFourLines,
} from "@/components/gestionale/gestionale-log-ui";
import { MezzoAssociationChangeEntry } from "@/components/gestionale/mezzi/mezzo-association-change-entry";
import { isAssociationHistoryEntry } from "@/lib/domain/mezzo/mezzo-association";
import { buildAnagraficaHistoryGestionaleLogViewModel } from "@/lib/mezzi/anagrafica-history-log-view-model";
import type { MezzoTimelineLavorazioneBlock } from "@/lib/mezzi/mezzo-timeline-feed";
import type { MezziHubLogEntry } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoAnagraficaHistoryRow } from "@/src/services/mezzo-anagrafica-history.service";
import { dsCardTitle, dsTypoCaption } from "@/lib/ui/design-system";
import { gestionaleCollapsibleShellBodyPadCompactClass } from "@/lib/ui/gestionale-collapsible-toggle";

const TIMELINE_RING =
  "ring-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))]";

const NESTED_EVENT_SHELL =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))]";

const LAV_BLOCK_SHELL =
  "overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] shadow-[var(--cab-shadow-sm)]";

function formatRangeDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function timelineDotClass(kind: string | undefined): string {
  if (kind === "lavorazione" || kind === "tagliando") {
    return `bg-[color:var(--cab-primary)] ring-2 ${TIMELINE_RING}`;
  }
  return `bg-[color:var(--cab-text-muted)] opacity-70 ring-2 ${TIMELINE_RING}`;
}

export function MezziHubTimelineLavorazioneBlock({
  block,
  defaultExpanded,
  onClose,
}: {
  block: MezzoTimelineLavorazioneBlock;
  defaultExpanded: boolean;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const titleId = `${panelId}-title`;

  const rangeLabel = block.rangeEnd
    ? `${formatRangeDate(block.rangeStart)} – ${formatRangeDate(block.rangeEnd)}`
    : `dal ${formatRangeDate(block.rangeStart)}`;

  const eventLabel = block.eventCount === 1 ? "1 evento" : `${block.eventCount} eventi`;

  return (
    <div className={LAV_BLOCK_SHELL}>
      <GestionaleCollapsiblePanel
        panelId={panelId}
        titleId={titleId}
        expanded={expanded}
        toggleLabel={`${expanded ? "Nascondi" : "Mostra"} lavorazione ${block.codice}`}
        onToggle={() => setExpanded((v) => !v)}
        compact
        form
        formFlat
        bodyPadClassName={`${gestionaleCollapsibleShellBodyPadCompactClass} px-3 pb-3 pt-2 sm:px-4 sm:pb-4`}
        headerActions={
          block.hasCriticalEvents ? (
            <span className="shrink-0 rounded-md border border-red-300/60 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
              Importante
            </span>
          ) : undefined
        }
        titleNode={
          <div className="min-w-0">
            <p id={titleId} className={`${dsCardTitle} text-sm leading-snug`}>
              Lavorazione <span className="font-mono tabular-nums">{block.codice}</span>
            </p>
            <p className={`${dsTypoCaption} mt-0.5 text-[color:var(--cab-text-muted)]`}>
              {rangeLabel} · {eventLabel}
            </p>
          </div>
        }
      >
        <ol className="list-none">
          {block.events.map((ev, index) => {
            const dotKind =
              ev.renderKind === "timeline_item"
                ? (ev.payload as { kind?: string }).kind
                : ev.renderKind === "log_modifiche"
                  ? "log"
                  : "anagrafica";

            return (
              <li key={ev.id} className="relative flex gap-3 py-2 first:pt-0 last:pb-0">
                <div className="relative flex w-5 shrink-0 justify-center pt-2">
                  {index < block.events.length - 1 ? (
                    <span
                      className="absolute top-4 bottom-0 left-1/2 w-px -translate-x-1/2 bg-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)]"
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={`relative z-10 h-2.5 w-2.5 shrink-0 rounded-full ${timelineDotClass(dotKind)}`}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {ev.renderKind === "log_modifiche" ? (
                    <div className={NESTED_EVENT_SHELL}>
                      <GestionaleLogEntryFourLines
                        vm={buildMezziGestionaleLogViewModel({
                          tipo: (ev.payload as MezziHubLogEntry).tipo,
                          mezzo: (ev.payload as MezziHubLogEntry).mezzo,
                          riepilogo: (ev.payload as MezziHubLogEntry).riepilogo,
                          autore: (ev.payload as MezziHubLogEntry).autore,
                          at: (ev.payload as MezziHubLogEntry).at,
                          changes: (ev.payload as MezziHubLogEntry).changes,
                          azione: (ev.payload as MezziHubLogEntry).azione,
                          tipoRiga: (ev.payload as MezziHubLogEntry).tipoRiga,
                          modifiche: (ev.payload as MezziHubLogEntry).modifiche,
                        })}
                      />
                    </div>
                  ) : null}
                  {ev.renderKind === "anagrafica_history" ? (
                    <div className={`${NESTED_EVENT_SHELL} px-3 py-2`}>
                      {(() => {
                        const entry = ev.payload as MezzoAnagraficaHistoryRow;
                        if (isAssociationHistoryEntry(entry.changed_fields as string[])) {
                          return <MezzoAssociationChangeEntry entry={entry} onNavigate={onClose} asDiv />;
                        }
                        return (
                          <GestionaleLogEntryFourLines
                            vm={buildAnagraficaHistoryGestionaleLogViewModel(entry)}
                          />
                        );
                      })()}
                    </div>
                  ) : null}
                  {ev.renderKind === "timeline_item" ? (
                    <MezziHubTimelineEventRow event={ev} onClose={onClose} nested />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </GestionaleCollapsiblePanel>
    </div>
  );
}
