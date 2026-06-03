"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KanbanCardMobile } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-card";
import type { KanbanMobileSection } from "@/components/gestionale/lavorazioni/lavorazioni-kanban-mobile-types";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const OPEN_SECTION_STORAGE_KEY = "lavorazioni-kanban-mobile-open-section";

function pickDefaultOpenSectionId(sections: readonly KanbanMobileSection[]): string {
  const withItems = sections.find((s) => s.items.length > 0 || (s.nested?.some((n) => n.items.length > 0) ?? false));
  return withItems?.id ?? sections[0]?.id ?? "";
}

function readStoredOpenSectionId(sections: readonly KanbanMobileSection[]): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(OPEN_SECTION_STORAGE_KEY);
    if (stored && sections.some((s) => s.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return null;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function sectionTotalCount(section: KanbanMobileSection): number {
  const nested = section.nested?.reduce((acc, n) => acc + n.items.length, 0) ?? 0;
  return section.items.length + nested;
}

type MobileBoardProps = {
  sections: readonly KanbanMobileSection[];
  statiOpts: readonly StatoLavorazioneConfig[];
  schedeStore: LavorazioneSchedeStore;
  defaultAddetto: string;
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
  defaultAddetto,
  prioritaColors,
  addettoColors,
  flashRowId,
  navBulkFlashIds,
  cardLabels,
}: MobileBoardProps) {
  const sectionIdsKey = useMemo(() => sections.map((s) => s.id).join("|"), [sections]);
  const [openSectionId, setOpenSectionId] = useState("");
  /** Evita di ri-sincronizzare ad ogni render quando `sections` è un nuovo array con gli stessi id. */
  const lastSyncedSectionIdsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (sections.length === 0) {
      setOpenSectionId("");
      lastSyncedSectionIdsKeyRef.current = null;
      return;
    }
    if (lastSyncedSectionIdsKeyRef.current === sectionIdsKey) return;
    lastSyncedSectionIdsKeyRef.current = sectionIdsKey;

    setOpenSectionId((prev) => {
      if (prev && sections.some((s) => s.id === prev)) return prev;
      const stored = readStoredOpenSectionId(sections);
      if (stored) return stored;
      return pickDefaultOpenSectionId(sections);
    });
  }, [sectionIdsKey, sections]);

  const toggleSection = useCallback((id: string) => {
    setOpenSectionId((prev) => {
      const next = prev === id ? "" : id;
      try {
        if (next) sessionStorage.setItem(OPEN_SECTION_STORAGE_KEY, next);
        else sessionStorage.removeItem(OPEN_SECTION_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

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
      <span className="shrink-0 rounded-md bg-zinc-200/90 px-2 py-0.5 text-xs font-bold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        {count}
      </span>
    </>
  );

  const renderMobileCard = (row: LavorazioneListRow, onOpen: (row: LavorazioneListRow) => void) => (
    <KanbanCardMobile
      key={row.id}
      row={row}
      schedeStore={schedeStore}
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
    <div className="lavorazioni-kanban-mobile min-w-0 max-w-full space-y-2 pb-2">
      {sections.map((section) => {
        const open = openSectionId === section.id;
        const total = sectionTotalCount(section);
        const panelId = `kanban-mobile-panel-${section.id}`;
        const headerId = `kanban-mobile-header-${section.id}`;

        return (
          <section
            key={section.id}
            className="lavorazioni-kanban-mobile-section overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50/60 dark:border-zinc-700/80 dark:bg-zinc-900/40"
          >
            <button
              type="button"
              id={headerId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggleSection(section.id)}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left touch-manipulation"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">{renderStatoHeaderInner(section.col, total)}</div>
              <ChevronIcon open={open} />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              aria-hidden={!open}
              className={`lavorazioni-kanban-mobile-panel ${open ? "lavorazioni-kanban-mobile-panel-open" : ""}`}
            >
              <div className="lavorazioni-kanban-mobile-panel-inner border-t border-zinc-200/80 px-2 pb-3 pt-1 dark:border-zinc-700/80">
                {section.items.length === 0 && !(section.nested?.some((n) => n.items.length > 0) ?? false) ? (
                  <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {section.items.map((row) => renderMobileCard(row, section.onOpen))}
                    {section.nested?.map((nested) => (
                      <div
                        key={nested.col.id}
                        className="space-y-2 rounded-lg border border-dashed border-zinc-200/90 bg-white/50 p-2 dark:border-zinc-700/80 dark:bg-zinc-950/30"
                      >
                        <div className="flex items-center justify-between gap-2 px-0.5">
                          {renderStatoHeaderInner(nested.col, nested.items.length, true)}
                        </div>
                        {nested.items.length === 0 ? (
                          <p className="py-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">Nessuna lavorazione</p>
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
