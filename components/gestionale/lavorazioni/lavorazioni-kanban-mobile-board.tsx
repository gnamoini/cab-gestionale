"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { KanbanCardMobile } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-card";
import type { KanbanMobileSection } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-types";
import { GestionaleCollapsibleHeader } from "@/components/design-system/gestionale-collapsible-header";
import { useAuthUserId } from "@/context/auth-context";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import {
  COLLAPSIBLE_KANBAN_OPEN_KEY,
  useCollapsiblePreference,
} from "@/lib/ui/collapsible-prefs";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

function pickDefaultOpenSectionId(sections: readonly KanbanMobileSection[]): string {
  const withItems = sections.find((s) => s.items.length > 0 || (s.nested?.some((n) => n.items.length > 0) ?? false));
  return withItems?.id ?? sections[0]?.id ?? "";
}

function sectionTotalCount(section: KanbanMobileSection): number {
  const nested = section.nested?.reduce((acc, n) => acc + n.items.length, 0) ?? 0;
  return section.items.length + nested;
}

type MobileBoardProps = {
  sections: readonly KanbanMobileSection[];
  statiOpts: readonly StatoLavorazioneConfig[];
  schedeStore: LavorazioneSchedeStore;
  addettiRecords?: readonly AddettoRecord[];
  prioritaColors: Record<string, string | undefined>;
  addettoColors: Record<string, string | undefined>;
  flashRowId: string | null;
  navBulkFlashIds: ReadonlySet<string>;
  cardLabels: {
    macchina: (row: LavorazioneListRow) => string;
    cliente: (row: LavorazioneListRow) => string;
    identSummary: (row: LavorazioneListRow) => string | null;
    addetto: (row: LavorazioneListRow) => string;
  };
};

export function LavorazioniKanbanMobileBoard({
  sections,
  statiOpts,
  schedeStore,
  addettiRecords,
  prioritaColors,
  addettoColors,
  flashRowId,
  navBulkFlashIds,
  cardLabels,
}: MobileBoardProps) {
  const userId = useAuthUserId();
  const sectionIdsKey = useMemo(() => sections.map((s) => s.id).join("|"), [sections]);
  const lastSyncedSectionIdsKeyRef = useRef<string | null>(null);
  const [openSectionIds, setOpenSectionIds] = useCollapsiblePreference<Set<string>>({
    scope: "lavorazioni",
    key: COLLAPSIBLE_KANBAN_OPEN_KEY,
    userId,
    defaultValue: new Set<string>(),
    serialize: (ids) => [...ids],
    deserialize: (raw, fallback) => {
      if (Array.isArray(raw)) {
        return new Set(raw.filter((id): id is string => typeof id === "string" && id.length > 0));
      }
      if (typeof raw === "string" && raw.trim()) {
        return new Set([raw.trim()]);
      }
      return new Set(fallback);
    },
  });

  useEffect(() => {
    if (sections.length === 0) {
      setOpenSectionIds(new Set());
      lastSyncedSectionIdsKeyRef.current = null;
      return;
    }
    if (lastSyncedSectionIdsKeyRef.current === sectionIdsKey) return;
    lastSyncedSectionIdsKeyRef.current = sectionIdsKey;

    setOpenSectionIds((prev) => {
      const valid = new Set([...prev].filter((id) => sections.some((s) => s.id === id)));
      if (valid.size > 0) return valid;
      const defaultId = pickDefaultOpenSectionId(sections);
      return defaultId ? new Set([defaultId]) : new Set();
    });
  }, [sectionIdsKey, sections, setOpenSectionIds]);

  const toggleSection = useCallback(
    (id: string) => {
      setOpenSectionIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [setOpenSectionIds],
  );

  const renderStatoHeaderInner = (statoCol: StatoLavorazioneConfig, count: number, compact?: boolean) => (
    <>
      <span
        className={[
          "inline-flex max-w-[min(100%,14rem)] items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
          compact ? "text-[10px]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={readablePillStyleFromHex(statoDisplayColor(statoCol.id, [...statiOpts]))}
      >
        <span className="truncate">{statoCol.label}</span>
      </span>
      <span className="shrink-0 rounded-md border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] px-2 py-0.5 text-xs font-bold tabular-nums text-[color:var(--cab-text)]">
        {count}
      </span>
    </>
  );

  const renderMobileCard = (row: LavorazioneListRow, onOpen: (row: LavorazioneListRow) => void) => (
    <KanbanCardMobile
      key={row.id}
      row={row}
      schedeStore={schedeStore}
      addettiRecords={addettiRecords}
      prioritaColors={prioritaColors}
      addettoColors={addettoColors}
      flash={flashRowId === row.id || navBulkFlashIds.has(row.id)}
      onOpen={() => onOpen(row)}
      macchina={cardLabels.macchina(row)}
      cliente={cardLabels.cliente(row)}
      identSummary={cardLabels.identSummary(row)}
      addetto={cardLabels.addetto(row)}
    />
  );

  return (
    <div className="lavorazioni-kanban-mobile min-w-0 max-w-full space-y-2.5 pb-2">
      {sections.map((section) => {
        const open = openSectionIds.has(section.id);
        const total = sectionTotalCount(section);
        const panelId = `kanban-mobile-panel-${section.id}`;

        return (
          <section
            key={section.id}
            className="lavorazioni-kanban-mobile-section overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] shadow-[var(--cab-shadow-sm)]"
          >
            <GestionaleCollapsibleHeader
              panelId={panelId}
              titleId={`${panelId}-trigger`}
              expanded={open}
              toggleLabel={`${open ? "Chiudi" : "Apri"} sezione ${section.col.label}`}
              onToggle={() => toggleSection(section.id)}
              titleNode={
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {renderStatoHeaderInner(section.col, total)}
                </div>
              }
              form
              formFlat
              surfaceClass="min-h-11 bg-transparent px-3 py-2.5 hover:bg-[var(--cab-hover)] touch-manipulation [-webkit-tap-highlight-color:transparent]"
            />

            <div
              id={`${panelId}-body`}
              role="region"
              aria-labelledby={`${panelId}-trigger`}
              aria-hidden={!open}
              className={`lavorazioni-kanban-mobile-panel ${open ? "lavorazioni-kanban-mobile-panel-open" : ""}`}
            >
              <div className="lavorazioni-kanban-mobile-panel-inner border-t border-[color:var(--cab-border)] px-2.5 pb-3 pt-1.5">
                {section.items.length === 0 && !(section.nested?.some((n) => n.items.length > 0) ?? false) ? (
                  <p className="py-4 text-center text-xs text-[color:var(--cab-text-muted)]">Nessuna lavorazione</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {section.items.map((row) => renderMobileCard(row, section.onOpen))}
                    {section.nested?.map((nested) => (
                      <div
                        key={nested.col.id}
                        className="space-y-2 rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-2"
                      >
                        <div className="flex items-center justify-between gap-2 px-0.5">
                          {renderStatoHeaderInner(nested.col, nested.items.length, true)}
                        </div>
                        {nested.items.length === 0 ? (
                          <p className="py-2 text-center text-[11px] text-[color:var(--cab-text-muted)]">Nessuna lavorazione</p>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            {nested.items.map((row) => renderMobileCard(row, section.onOpen))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
