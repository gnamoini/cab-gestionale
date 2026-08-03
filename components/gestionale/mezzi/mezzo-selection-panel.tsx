"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LoadingErrorState } from "@/components/design-system";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { HighlightSearchMatch } from "@/components/gestionale/global-input/highlight-search-match";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { GlobalVirtualizedListbox } from "@/components/gestionale/global-input/global-virtualized-listbox";
import {
  formatMezzoPickerCompactLines,
  formatMezzoSearchChipLabel,
} from "@/lib/mezzi/format-mezzo-search-result";
import { readMezzoSelectionRecents } from "@/lib/mezzi/mezzo-selection-recents";
import {
  resolveSingleMezzoPickerEnter,
  searchMezziForPicker,
  type MezzoPickerListItem,
} from "@/lib/mezzi/search-mezzi-for-picker";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoSelectionSource, SelectedMezzoContext } from "@/lib/lavorazioni/selected-mezzo-context";
import { useSelectorListboxKeyboard } from "@/lib/selector-interaction/use-selector-listbox-keyboard";
import { dsBtnPrimary, GESTIONALE_SEARCH_PLACEHOLDER } from "@/lib/ui/design-system";

const SEARCH_DEBOUNCE_MS = 180;
const MEZZO_ROW_ESTIMATE_HEIGHT = 82;
/** Altezza fissa area lista — senza max-h il flex cresce col contenuto e non scrolla. */
const MEZZO_PICKER_LIST_SCROLL_CLASS =
  "gestionale-scrollbar min-h-[10rem] max-h-[min(28rem,calc(92dvh-14rem))] overflow-y-auto overscroll-y-contain touch-pan-y [scrollbar-gutter:stable] px-1.5 py-1.5 sm:px-2 sm:py-2 max-md:max-h-[min(36rem,calc(100dvh-12rem))] [&>[data-listbox-row-index]]:mb-3.5";

function mezzoPickerCardClass(): string {
  return [
    "w-full rounded-[var(--ds-radius-lg)] border px-3.5 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150 outline-none touch-manipulation",
    "border-[color:color-mix(in_srgb,var(--cab-border)_85%,transparent)] bg-[var(--cab-surface)] shadow-[0_1px_2px_color-mix(in_srgb,var(--cab-border)_35%,transparent)]",
    "hover:border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-sm)] hover:ring-2 hover:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]",
  ].join(" ");
}

function MezzoPickerOptionRow({
  lines,
  highlightQ,
  active,
  fallbackLabel,
  onSelect,
  onMouseEnter,
}: {
  lines: string[];
  highlightQ: string;
  active: boolean;
  fallbackLabel: string;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  const [primary, ...details] = lines;

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={mezzoPickerCardClass()}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
    >
      {lines.length === 0 ? (
        <p className="text-sm font-semibold leading-snug text-[color:var(--cab-fg)]">
          <HighlightSearchMatch text={fallbackLabel} query={highlightQ} />
        </p>
      ) : (
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold leading-snug text-[color:var(--cab-fg)]">
            <HighlightSearchMatch text={primary ?? fallbackLabel} query={highlightQ} />
          </p>
          {details.map((line, lineIndex) => (
            <p
              key={lineIndex}
              className="text-sm leading-snug text-[color:var(--cab-text)] [overflow-wrap:anywhere]"
            >
              <HighlightSearchMatch text={line} query={highlightQ} />
            </p>
          ))}
        </div>
      )}
    </button>
  );
}

function mezzoSelectionSourceFromSection(sectionId: string | undefined): MezzoSelectionSource {
  if (sectionId === "recenti") return "recent";
  if (sectionId?.startsWith("cliente:")) return "cliente-group";
  return "search";
}

function ListSkeleton() {
  return (
    <div className="space-y-2 py-1" aria-busy="true" aria-label="Caricamento mezzi">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-[var(--ds-radius-lg)] bg-[color:color-mix(in_srgb,var(--cab-border)_35%,var(--cab-surface))]"
        />
      ))}
    </div>
  );
}

export function MezzoSelectionPanel({
  catalog,
  catalogLoading,
  catalogError,
  query,
  onQueryChange,
  onSelect,
  userId,
  listFooter,
}: {
  catalog: readonly MezzoGestito[];
  catalogLoading: boolean;
  catalogError?: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (ctx: SelectedMezzoContext) => void;
  userId?: string | null;
  /** Slot opzionale sotto la lista (es. shell con footer esterno). */
  listFooter?: React.ReactNode;
}) {
  const listboxId = useId();
  const listScrollRef = useRef<HTMLDivElement>(null);
  const scrollToRowRef = useRef<((index: number) => void) | null>(null);
  const keyboardScrollPendingRef = useRef(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const recentIds = useMemo(() => readMezzoSelectionRecents(userId), [userId, catalog.length]);

  const searchResult = useMemo(
    () =>
      searchMezziForPicker(catalog, debouncedQuery, {
        recentIds,
        userId,
      }),
    [catalog, debouncedQuery, recentIds, userId],
  );

  const navigableItems = useMemo(
    () => searchResult.items.filter((item): item is Extract<MezzoPickerListItem, { kind: "mezzo" }> => item.kind === "mezzo"),
    [searchResult.items],
  );

  const sectionByNavIndex = useMemo(() => {
    const map = new Map<number, string>();
    let lastSection = debouncedQuery.trim() ? "search" : "recenti";
    for (const item of searchResult.items) {
      if (item.kind === "section") lastSection = item.sectionId;
      else map.set(item.navigableIndex, lastSection);
    }
    return map;
  }, [searchResult.items, debouncedQuery]);

  const selectMezzo = useCallback(
    (mezzo: MezzoGestito, navigableIndex: number) => {
      const sectionId = sectionByNavIndex.get(navigableIndex);
      onSelect({
        mode: "existing",
        mezzoId: mezzo.id,
        source: mezzoSelectionSourceFromSection(sectionId),
      });
    },
    [onSelect, sectionByNavIndex],
  );

  const handleEnter = useCallback(() => {
    const single = resolveSingleMezzoPickerEnter(searchResult);
    if (single) {
      const idx = navigableItems.findIndex((item) => item.mezzo.id === single.id);
      selectMezzo(single, idx >= 0 ? idx : 0);
      return;
    }
    if (activeIndex >= 0 && activeIndex < navigableItems.length) {
      const row = navigableItems[activeIndex]!;
      selectMezzo(row.mezzo, row.navigableIndex);
    }
  }, [activeIndex, navigableItems, searchResult, selectMezzo]);

  const handleListKeyDown = useSelectorListboxKeyboard({
    open: true,
    totalNavigableOptions: navigableItems.length,
    activeIndex,
    setOpen: () => {},
    setActiveIndex,
    onEscape: () => {},
    onEnter: handleEnter,
  });

  const runListboxKeyboard = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") {
        keyboardScrollPendingRef.current = true;
      }
      handleListKeyDown(e);
    },
    [handleListKeyDown],
  );

  const onSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      runListboxKeyboard(e);
    },
    [runListboxKeyboard],
  );

  useEffect(() => {
    if (activeIndex < 0) return;
    // ponytail: scroll solo da tastiera — hover mouse non deve centrare la riga
    if (!keyboardScrollPendingRef.current) return;
    keyboardScrollPendingRef.current = false;
    scrollToRowRef.current?.(activeIndex);
  }, [activeIndex]);

  const onListWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight > el.clientHeight + 1) {
      e.stopPropagation();
    }
  }, []);

  const showDuplicateWarning =
    searchResult.hasSearchQuery && !catalogLoading && catalog.length > 0 && navigableItems.length === 0;

  const catalogInitialLoading = catalogLoading && catalog.length === 0;
  const highlightQ = debouncedQuery.trim();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="shrink-0">
        <GestionaleSearchField
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActiveIndex(-1);
          }}
          onKeyDown={onSearchKeyDown}
          placeholder={GESTIONALE_SEARCH_PLACEHOLDER}
          aria-label="Cerca mezzo"
          aria-controls={listboxId}
          autoComplete="off"
          autoFocus
          disabled={catalogInitialLoading}
        />
      </div>

      {catalogError ? (
        <LoadingErrorState title="Errore caricamento mezzi" description={catalogError} />
      ) : catalogInitialLoading ? (
        <ListSkeleton />
      ) : catalog.length === 0 && !catalogLoading ? (
        <p className="px-1 py-3 text-sm text-[color:var(--cab-text-muted)]">
          Nessun mezzo in anagrafica. Usa &quot;Nuovo mezzo&quot; per registrare il primo.
        </p>
      ) : (
        <div className="min-h-0 shrink-0 overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_38%,var(--cab-card))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--cab-border)_35%,transparent)]">
          {showDuplicateWarning ? (
            <div
              role="status"
              className="mx-2 mt-2 shrink-0 rounded-[var(--ds-radius-lg)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
            >
              Nessun risultato trovato. Verifica di non creare un duplicato prima di procedere.
            </div>
          ) : null}

          <div
            ref={listScrollRef}
            className={MEZZO_PICKER_LIST_SCROLL_CLASS}
            onKeyDown={runListboxKeyboard}
            onWheel={onListWheel}
          >
            {navigableItems.length === 0 && !searchResult.hasSearchQuery ? (
              <p className="px-2 py-6 text-center text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                Digita targa, matricola, cliente o marca per filtrare l&apos;anagrafica.
              </p>
            ) : null}

            {navigableItems.length === 0 && searchResult.hasSearchQuery && !showDuplicateWarning ? null : (
              <GlobalVirtualizedListbox
                rowCount={searchResult.items.length}
                scrollRef={listScrollRef}
                scrollToRowRef={scrollToRowRef}
                externalScrollHost
                estimateRowHeight={MEZZO_ROW_ESTIMATE_HEIGHT}
                id={listboxId}
                role="listbox"
                aria-label="Risultati ricerca mezzi"
                renderRow={(index) => {
                  const item = searchResult.items[index];
                  if (!item) return null;
                  if (item.kind === "section") {
                    return (
                      <div
                        className="sticky top-0 z-[1] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_38%,var(--cab-card))] px-2 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--cab-text-muted)] backdrop-blur-[2px]"
                        role="presentation"
                      >
                        {item.label}
                        {item.count != null ? ` (${item.count})` : ""}
                      </div>
                    );
                  }
                  const lines = formatMezzoPickerCompactLines(item.mezzo);
                  const isActive = item.navigableIndex === activeIndex;
                  return (
                    <div role="presentation" data-listbox-row-index={item.navigableIndex}>
                      <MezzoPickerOptionRow
                        lines={lines}
                        highlightQ={highlightQ}
                        active={isActive}
                        fallbackLabel={formatMezzoSearchChipLabel(item.mezzo)}
                        onSelect={() => selectMezzo(item.mezzo, item.navigableIndex)}
                        onMouseEnter={() => setActiveIndex(item.navigableIndex)}
                      />
                    </div>
                  );
                }}
              />
            )}
          </div>
        </div>
      )}

      {listFooter}
    </div>
  );
}

export function MezzoSelectionPanelFooter({
  onNuovoMezzo,
  showDuplicateWarning,
}: {
  onNuovoMezzo: () => void;
  showDuplicateWarning?: boolean;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <p className="min-w-0 text-xs leading-snug text-[color:var(--cab-text-muted)]">
        {showDuplicateWarning
          ? "Se il mezzo esiste già, torna indietro e affina la ricerca."
          : "Non trovi il mezzo? Registralo in anagrafica."}
      </p>
      <button
        type="button"
        className={`${dsBtnPrimary} min-h-11 w-full shrink-0 sm:w-auto sm:min-w-[11rem]`}
        onClick={onNuovoMezzo}
      >
        <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
        Nuovo mezzo
      </button>
    </div>
  );
}

export function MezzoSelectionPanelPrimaryFooter({
  onNuovoMezzo,
}: {
  onNuovoMezzo: () => void;
}) {
  return (
    <button type="button" className={`${dsBtnPrimary} min-h-11 w-full`} onClick={onNuovoMezzo}>
      <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
      Nuovo mezzo
    </button>
  );
}
